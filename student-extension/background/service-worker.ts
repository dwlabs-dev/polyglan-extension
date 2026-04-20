/**
 * Responsibilities:
 * 1. Handle Google OAuth authentication.
 * 2. Manage Audio Capture via Offscreen Document & WebSocket.
 * 3. Orchestrate session state and synchronize it with the Popup UI.
 */

import {
  WsMessage,
  SessionMode,
  SessionStatus,
  SupportedLang
} from '../src/types/index';
import { socketService } from '../src/services/socket.service';

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

interface Feedback {
  id: string;
  text: string;
  level: 'info' | 'warning' | 'success';
  timestamp: number;
}

interface SessionState {
  status: SessionStatus;
  mode: SessionMode;
  modeSegmentId: string | null;
  studentId: string | null;
  sessionId: string | null;
  userName: string | null;
  googleEmail: string | null;
  lang: SupportedLang;
  interimTranscript: string;
  feedbackMessages: Feedback[];
}

// ---------------------------------------------------------------------------
// Session State Manager
// ---------------------------------------------------------------------------

class SessionStateManager {
  private state: SessionState = {
    status: 'idle',
    mode: null,
    modeSegmentId: null,
    studentId: null,
    sessionId: null,
    userName: null,
    googleEmail: null,
    lang: 'pt-BR',
    interimTranscript: '',
    feedbackMessages: []
  };

  constructor() {}

  public getState(): SessionState {
    return { ...this.state };
  }

  public updateState(updates: Partial<SessionState>): void {
    this.state = { ...this.state, ...updates };
    this.notifySubscribers();
  }

  public addFeedback(text: string, level: 'info' | 'warning' | 'success'): void {
    const newFeedback: Feedback = {
      id: `${Date.now()}-${Math.random()}`,
      text,
      level,
      timestamp: Date.now()
    };

    const updatedFeedback = [...this.state.feedbackMessages, newFeedback];
    this.updateState({ feedbackMessages: updatedFeedback });

    // Auto-remove feedback after 10s
    setTimeout(() => {
      const filtered = this.state.feedbackMessages.filter(f => f.id !== newFeedback.id);
      this.updateState({ feedbackMessages: filtered });
    }, 10000);
  }

  private notifySubscribers(): void {
    // Notify all listeners of the state change
    chrome.runtime.sendMessage({
      type: 'SESSION_STATE_UPDATED',
      payload: this.state
    }).catch(() => {
      // Ignore errors if no one is listening (e.g. popup is closed)
    });
  }
}

const sessionManager = new SessionStateManager();

// ---------------------------------------------------------------------------
// Promise resolver for waiting for offscreen document to be ready
// ---------------------------------------------------------------------------

let offscreenReadyResolver: ((value: void) => void) | null = null;
let isOffscreenReady = false;

async function waitForOffscreenReady(timeoutMs = 5000): Promise<void> {
  if (isOffscreenReady) return Promise.resolve();

  return new Promise<void>((resolve, reject) => {
    offscreenReadyResolver = resolve;

    setTimeout(() => {
      if (offscreenReadyResolver) {
        offscreenReadyResolver = null;
        reject(new Error(`Timeout waiting for offscreen document to be ready after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });
}

// ---------------------------------------------------------------------------
// Global Meeting State (Non-persistent - lives for SW lifetime)
// ---------------------------------------------------------------------------

let activeMeetingId: string | null = null;
let pendingSpeakerId: string | null = null;

// ---------------------------------------------------------------------------
// Message Router
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('Polyglan Student extension installed');
});

chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
  const senderId = sender.tab ? `Tab ${sender.tab.id}` : 'Extension';
  console.log(`[ServiceWorker] 📥 Incoming message from ${senderId}:`, request);

  // --- Auth logic ---
  if (request.action === 'authenticateWithGoogle') {
    authenticateWithGoogle()
      .then((result) => {
        console.log('[ServiceWorker] Authentication successful. Result:', result);
        sessionManager.updateState({
          status: 'waiting',
          googleEmail: result.email,
          userName: result.name
        });

        // CRITICAL: If a meeting is already active, restart capture with the now-authenticated user
        if (activeMeetingId) {
          console.log('[ServiceWorker] 🚀 Meeting found! Starting capture with authenticated identity.');
          handleStartRecording(activeMeetingId, pendingSpeakerId || 'unknown');
        }

        sendResponse({ success: true, data: result });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        console.error('[ServiceWorker] Auth error:', message);
        sendResponse({ success: false, error: message });
      });
    return true;
  }

  if (request.action === 'ping') {
    sendResponse({ success: true, pong: true });
    return false;
  }

  // --- State synchronization logic ---
  if (request.action === 'GET_STATE') {
    sendResponse(sessionManager.getState());
    return false;
  }

  // --- Audio Capture logic ---
  if (request.type === 'START_RECORDING') {
    handleStartRecording(request.meetingId!, request.speakerId!)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open
  }

  if (request.type === 'STOP_RECORDING') {
    handleStopRecording()
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open
  }

  if (request.type === 'AUDIO_CHUNK') {
    handleAudioChunk(request.chunk!);
    return false;
  }

  if (request.type === 'OFFSCREEN_READY') {
    console.log('[ServiceWorker] Offscreen document is ready.');
    isOffscreenReady = true;
    if (offscreenReadyResolver) {
      offscreenReadyResolver();
      offscreenReadyResolver = null;
    }
    return false;
  }

  if (request.type === 'PERMISSION_GRANTED') {
    console.log('[ServiceWorker] ✅ Microphone permission granted via tab! Retrying capture...');
    if (activeMeetingId) {
      handleStartRecording(activeMeetingId, pendingSpeakerId || 'unknown');
    }
    return false;
  }

  if (request.type === 'RECORDING_ERROR') {
    console.error(`[ServiceWorker] Recording error from offscreen: ${request.error}`);
    
    if (request.error === 'Permission dismissed' || request.error?.includes('Permission')) {
      console.warn('[ServiceWorker] 🎤 Microphone blocked. Opening permissions tab...');
      chrome.tabs.create({ url: 'permissions.html' });
    }
    
    sessionManager.updateState({ status: 'idle' });
    return false;
  }

  return false;
});

// --- Audio Handlers ---

async function handleStartRecording(meetingId: string, speakerId: string) {
  // Store meeting state for post-auth recovery
  activeMeetingId = meetingId;
  pendingSpeakerId = speakerId;

  const currentState = sessionManager.getState();
  
  // If not authenticated, we don't start recording yet to avoid "Permission dismissed" 
  // and identity issues. The capture will trigger automatically after login.
  if (!currentState.googleEmail) {
    console.log('[ServiceWorker] ⏳ Waiting for student authentication before starting capture...');
    return;
  }

  if (currentState.status === 'recording' && currentState.sessionId === meetingId) {
    console.warn('[ServiceWorker] Already recording this meeting.');
    return;
  }

  console.log(`[ServiceWorker] 🎙️ Starting recording session for ${meetingId}...`);
  
  // Update state with correct IDs
  sessionManager.updateState({
    status: 'recording',
    sessionId: meetingId,
    studentId: speakerId
  });

  try {
    // 2. Create Offscreen Document securely
    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: 'offscreen/offscreen.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Capturing microphone for Polyglan AI'
      });
    }

    // 3. Wait for the offscreen document to signal it is ready
    await waitForOffscreenReady();

    // 4. Connect to WebSocket
    await socketService.connect(meetingId, speakerId, currentState.userName || undefined);

    // Attach listener for socket messages to update session state (transcriptions, commands)
    socketService.onMessage((message: WsMessage) => {
        handleSocketMessage(message);
    });

    // 5. Tell the offscreen document to start recording
    chrome.runtime.sendMessage({ type: 'START_RECORDING' });
    console.log('[ServiceWorker] Sent START_RECORDING to offscreen document.');

  } catch (err: any) {
    console.error('[ServiceWorker] Failed to start audio capture session:', err);
    sessionManager.updateState({ status: 'idle' });
    await handleStopRecording();
  }
}

async function handleStopRecording() {
  console.log('[ServiceWorker] Stopping audio capture session.');
  activeMeetingId = null;
  pendingSpeakerId = null;
  sessionManager.updateState({ status: 'idle', interimTranscript: '' });
  isOffscreenReady = false;

  // 1. Disconnect WebSocket
  socketService.disconnect();

  // 2. Close Offscreen Document
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    console.error('[ServiceWorker] Failed to close offscreen document:', err);
  }
}

function handleAudioChunk(chunk: string) {
  const currentState = sessionManager.getState();
  if (currentState.status === 'recording' && currentState.sessionId && currentState.studentId) {
    socketService.send({
      type: 'AUDIO_CHUNK',
      sessionId: currentState.sessionId,
      payload: {
        chunk: chunk,
        lang: currentState.lang,
        mode: currentState.mode,
        modeSegmentId: currentState.modeSegmentId,
        studentId: currentState.studentId
      },
      timestamp: Date.now()
    });
  }
}

function handleSocketMessage(message: WsMessage) {
  switch (message.type) {
    case 'SESSION_COMMAND': {
      const payload = message.payload as any;
      const command = payload.command;
      const currentState = sessionManager.getState();

      if (command === 'START') {
        sessionManager.updateState({
          mode: payload.mode,
          modeSegmentId: payload.modeSegmentId,
          status: 'recording'
        });
      } else if (command === 'PAUSE') {
        sessionManager.updateState({ status: 'paused' });
      } else if (command === 'STOP') {
        handleStopRecording();
      }
      break;
    }
    case 'TRANSCRIPTION_FRAGMENT': {
      const payload = message.payload as any;
      sessionManager.updateState({ interimTranscript: payload.text });
      break;
    }
    case 'FEEDBACK': {
      const payload = message.payload as any;
      sessionManager.addFeedback(payload.text, payload.level);
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

async function authenticateWithGoogle(): Promise<{ authCode: string, email: string, name: string }> {
  return new Promise((resolve, reject) => {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    const extensionId = chrome.runtime.id;
    const redirectUri = `https://${extensionId}.chromiumapp.org/`;

    authUrl.searchParams.append('client_id', chrome.runtime.getManifest().oauth2?.client_id ?? '');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'select_account');

    chrome.identity.launchWebAuthFlow(
      { url: authUrl.toString(), interactive: true },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Auth flow failed: ${chrome.runtime.lastError.message}`));
          return;
        }
        if (!redirectUrl) {
          reject(new Error('Auth flow was cancelled'));
          return;
        }

        const url = new URL(redirectUrl);
        const authCode = url.searchParams.get('code');
        const error = url.searchParams.get('error');

        if (error) {
          reject(new Error(`Google auth error: ${error}`));
          return;
        }
        if (!authCode) {
          reject(new Error('No authorization code received'));
          return;
        }

        // Return a slightly better placeholder for email/name
        resolve({ 
            authCode, 
            email: 'student@polyglan.ai', // Placeholder until exchanged for token
            name: 'Aluno Polyglan' 
        });
      }
    );
  });
}
