/**
 * Service Worker for Polyglan Student Extension (Manifest V3)
 *
 * Responsabilities:
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
// Audio WebSocket Manager (Refactored to use SessionManager)
// ---------------------------------------------------------------------------

class AudioWebSocketManager {
  private socket: WebSocket | null = null;
  private meetingId: string | null = null;
  private speakerId: string | null = null;
  private streamId: string | null = null;
  private reconnectTimer: any = null;
  private isConnecting: boolean = false;

  private getWsUrl(): string {
    let wsUrl = 'ws://localhost:3002';
    return wsUrl;
  }

  public async connect(meetingId: string, speakerId: string): Promise<void> {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    this.meetingId = meetingId;
    this.speakerId = speakerId;
    this.streamId = Date.now().toString();

    const wsUrl = this.getWsUrl();
    console.log(`[ServiceWorker] Connecting to Audio WebSocket: ${wsUrl}`);

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[ServiceWorker] Audio WebSocket connected!');
        this.isConnecting = false;
      };

      this.socket.onclose = () => {
        console.warn('[ServiceWorker] Audio WebSocket closed');
        this.socket = null;
        this.isConnecting = false;
      };

      this.socket.onerror = (err) => {
        console.error('[ServiceWorker] Audio WebSocket error:', err);
        this.isConnecting = false;
      };

      this.socket.onmessage = (event) => {
        console.log('[ServiceWorker] Received unexpected message from Audio WS:', event.data);
      };

    } catch (err) {
      this.isConnecting = false;
      console.error('[ServiceWorker] Failed to initiate WebSocket:', err);
      throw err;
    }
  }

  public sendChunk(chunk: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.meetingId && this.speakerId && this.streamId) {
      this.socket.send(
        JSON.stringify({
          meetingId: this.meetingId,
          speakerId: this.speakerId,
          streamId: this.streamId,
          timestamp: Date.now(),
          chunk: chunk
        })
      );
    }
  }

  public disconnect(): void {
    if (this.socket) {
      console.log('[ServiceWorker] Disconnecting Audio WebSocket.');
      this.socket.close();
      this.socket = null;
    }
    this.meetingId = null;
    this.speakerId = null;
    this.streamId = null;
  }
}

const audioWSManager = new AudioWebSocketManager();

// Promise resolver for waiting for offscreen document to be ready
let offscreenReadyResolver: ((value: void) => void) | null = null;

async function waitForOffscreenReady(timeoutMs = 5000): Promise<void> {
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
// Message Router
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('Polyglan Student extension installed');
});

chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
  // --- Auth logic ---
  if (request.action === 'authenticateWithGoogle') {
    authenticateWithGoogle()
      .then((result) => {
        console.log('[ServiceWorker] Authentication successful');
        sessionManager.updateState({
          status: 'waiting',
          googleEmail: result.email,
          userName: result.name
        });
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
    handleStartRecording(request.meetingId!, request.speakerId!);
    return false;
  }

  if (request.type === 'STOP_RECORDING') {
    handleStopRecording();
    return false;
  }

  if (request.type === 'AUDIO_CHUNK') {
    handleAudioChunk(request.chunk!);
    return false;
  }

  if (request.type === 'OFFSCREEN_READY') {
    console.log('[ServiceWorker] Offscreen document is ready.');
    if (offscreenReadyResolver) {
      offscreenReadyResolver();
      offscreenReadyResolver = null;
    }
    return false;
  }

  if (request.type === 'RECORDING_ERROR') {
    console.error('[ServiceWorker] Recording error from offscreen:', request.error);
    sessionManager.updateState({ status: 'idle' });
    return false;
  }

  return false;
});

// --- Audio Handlers ---

async function handleStartRecording(meetingId: string, speakerId: string) {
  const currentState = sessionManager.getState();
  if (currentState.status === 'recording') {
    console.warn('[ServiceWorker] Already recording.');
    return;
  }

  console.log(`[ServiceWorker] Starting recording session for ${meetingId}/${speakerId}...`);
  sessionManager.updateState({ status: 'recording' });

  try {
    // 1. Create Offscreen Document securely
    const hasDoc = await chrome.offscreen.hasDocument();
    if (!hasDoc) {
      await chrome.offscreen.createDocument({
        url: 'offscreen/offscreen.html',
        reasons: [chrome.offscreen.Reason.USER_MEDIA],
        justification: 'Capturing microphone for Polyglan AI'
      });
    }

    // 2. Wait for the offscreen document to signal it is ready
    await waitForOffscreenReady();

    // 3. Connect to WebSocket
    await socketService.connect(meetingId, speakerId, currentState.userName || undefined);

    // Attach listener for socket messages to update session state (transcriptions, commands)
    socketService.onMessage((message: WsMessage) => {
        handleSocketMessage(message);
    });

    // 4. Tell the offscreen document to start recording
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
  sessionManager.updateState({ status: 'idle', interimTranscript: '' });

  // 1. Disconnect WebSocket
  socketService.disconnect();
  audioWSManager.disconnect();

  // 2. Close Offscreen Document
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    console.error('[ServiceWorker] Failed to close offscreen document:', err);
  }
}

function handleAudioChunk(chunk: string) {
  const currentState = sessionManager.getState();
  if (currentState.status === 'recording') {
    socketService.send({
      type: 'TRANSCRIPTION_FRAGMENT',
      sessionId: currentState.sessionId!,
      payload: {
        text: chunk,
        isFinal: false,
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
        // Start transcription capture in offscreen (already started by handleStartRecording)
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
    // ... other cases as needed
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

        resolve({ authCode, email: '', name: '' }); // Note: In a real app, we'd fetch user info or derive it from the backend response
      }
    );
  });
}
