/**
 * Service Worker for Polyglan Student Extension (Manifest V3)
 *
 * Responsibilities:
 * 1. Handle Google OAuth authentication.
 * 2. Manage Audio Capture via Offscreen Document & WebSocket.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthMessage {
  action: 'authenticateWithGoogle' | 'ping';
}

interface AudioMessage {
  type: 'START_RECORDING' | 'STOP_RECORDING' | 'AUDIO_CHUNK' | 'OFFSCREEN_READY' | 'RECORDING_ERROR';
  meetingId?: string;
  speakerId?: string;
  chunk?: string;
  error?: string;
}

// ---------------------------------------------------------------------------
// Audio WebSocket Manager
// ---------------------------------------------------------------------------

class AudioWebSocketManager {
  private socket: WebSocket | null = null;
  private meetingId: string | null = null;
  private speakerId: string | null = null;
  private streamId: string | null = null;
  private reconnectTimer: number | null = null;
  private isConnecting: boolean = false;

  constructor() {}

  private getWsUrl(): string {
    // Using the same logic as before to derive the audio port (3002) from the API URL (3001)
    // Note: In a real production build, we'd ideally use a dedicated env var.
    // For now, we rely on the same replacement logic used in the frontend.

    // We use a fallback for development/local testing.
    let wsUrl = 'ws://localhost:3002';

    // If we were in a bundled environment where import.meta.env is available:
    // const baseWsUrl = (import.meta.env.VITE_WS_URL as string).replace('3001/ws', '3002').replace('3001', '3002').replace('/ws', '');
    // wsUrl = baseWsUrl.startsWith('http') ? baseWsUrl.replace('http', 'ws') : baseWsUrl;
    // if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://') && !wsUrl.includes('localhost')) {
    //    wsUrl = wsUrl.replace('ws://', 'wss://');
    // }

    // However, since we are in a Service Worker, we don't have access to 'window'.
    // We'll assume that if it's not localhost, it should be wss.
    // For this implementation, I'll use a more robust way if possible,
    // but for now I'll stick to the known working logic.

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
        // Reconnect logic if we are still supposed to be recording
        // We'll check this in the next message or via a state flag
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
    } else {
      console.warn('[ServiceWorker] Cannot send chunk: WebSocket not open or missing metadata.');
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
let isRecording = false;

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('Polyglan Student extension installed');
});

chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
  const authRequest = request as AuthMessage;

  // --- Auth logic ---
  if (authRequest.action === 'authenticateWithGoogle') {
    authenticateWithGoogle()
      .then((result) => {
        console.log('[ServiceWorker] Authentication successful');
        sendResponse({ success: true, data: result });
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Authentication failed';
        console.error('[ServiceWorker] Auth error:', message);
        sendResponse({ success: false, error: message });
      });
    return true;
  }

  if (authRequest.action === 'ping') {
    sendResponse({ success: true, pong: true });
    return false;
  }

  // --- Audio Capture logic ---
  const audioRequest = request as AudioMessage;

  if (audioRequest.type === 'START_RECORDING') {
    handleStartRecording(audioRequest.meetingId!, audioRequest.speakerId!);
    return false; // Async handling
  }

  if (audioRequest.type === 'STOP_RECORDING') {
    handleStopRecording();
    return false;
  }

  if (audioRequest.type === 'AUDIO_CHUNK') {
    handleAudioChunk(audioRequest.chunk!);
    return false;
  }

  if (audioRequest.type === 'OFFSCREEN_READY') {
    console.log('[ServiceWorker] Offscreen document is ready.');
    return false;
  }

  if (audioRequest.type === 'RECORDING_ERROR') {
    console.error('[ServiceWorker] Recording error from offscreen:', audioRequest.error);
    isRecording = false;
    return false;
  }

  return false;
});

// --- Audio Handlers ---

async function handleStartRecording(meetingId: string, speakerId: string) {
  if (isRecording) {
    console.warn('[ServiceWorker] Already recording.');
    return;
  }

  console.log(`[ServiceWorker] Starting recording session for ${meetingId}/${speakerId}...`);
  isRecording = true;

  try {
    // 1. Create Offscreen Document
    // We use 'reinstall: true' to ensure we have a fresh instance if one was left hanging
    await chrome.offscreen.createDocument({
      url: 'offscreen/offscreen.html',
      reinstall: true
    });

    // 2. Connect to WebSocket
    await audioWSManager.connect(meetingId, speakerId);

  } catch (err: any) {
    console.error('[ServiceWorker] Failed to start audio capture session:', err);
    isRecording = false;
    // Optionally notify content script about the failure
  }
}

async function handleStopRecording() {
  console.log('[ServiceWorker] Stopping audio capture session.');
  isRecording = false;

  // 1. Disconnect WebSocket
  audioWSManager.disconnect();

  // 2. Close Offscreen Document
  try {
    await chrome.offscreen.closeDocument();
  } catch (err) {
    console.error('[ServiceWorker] Failed to close offscreen document:', err);
  }
}

function handleAudioChunk(chunk: string) {
  if (isRecording) {
    audioWSManager.sendChunk(chunk);
  } else {
    console.warn('[ServiceWorker] Received chunk but recording is not active.');
  }
}

// ---------------------------------------------------------------------------
// Google OAuth
// ---------------------------------------------------------------------------

async function authenticateWithGoogle(): Promise<{ authCode: string }> {
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

        resolve({ authCode });
      }
    );
  });
}
