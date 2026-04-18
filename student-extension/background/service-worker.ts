/**
 * Service Worker for Polyglan Student Extension (Manifest V3)
 *
 * Responsibilities:
 * 1. Handle Google OAuth authentication.
 * 2. Coordinate Audio Capture using Offscreen Document API (required in MV3).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StartCaptureMessage {
  type: 'START_CAPTURE';
  meetingId: string;
  speakerId: string;
}

interface StopCaptureMessage {
  type: 'STOP_CAPTURE';
}

interface AuthMessage {
  action: 'authenticateWithGoogle' | 'ping';
}

type IncomingMessage = StartCaptureMessage | StopCaptureMessage | AuthMessage;

const OFFSCREEN_PATH = 'offscreen/offscreen.html';

// ---------------------------------------------------------------------------
// Offscreen Document Management
// ---------------------------------------------------------------------------

/**
 * Ensures the offscreen document exists before sending a message.
 */
async function setupOffscreen() {
  // Check if document already exists
  // @ts-ignore - getContexts is a newer API
  const existingContexts = await (chrome.runtime as any).getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts && existingContexts.length > 0) {
    return;
  }

  // Create document
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_PATH,
    reasons: [chrome.offscreen.Reason.USER_MEDIA],
    justification: 'Capturing tab audio for AI transcription analysis.',
  });
}

async function closeOffscreen() {
  // @ts-ignore - getContexts is a newer API
  const existingContexts = await (chrome.runtime as any).getContexts({
    contextTypes: ['OFFSCREEN_DOCUMENT'],
  });

  if (existingContexts && existingContexts.length > 0) {
    await chrome.offscreen.closeDocument();
  }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

// Store capture metadata per tab to use when the user clicks the extension icon
const pendingCaptures = new Map<number, { meetingId: string; speakerId: string }>();

// ---------------------------------------------------------------------------
// Capture Logic
// ---------------------------------------------------------------------------

async function initiateCapture(tabId: number, meetingId: string, speakerId: string, streamId?: string) {
  console.log(`[ServiceWorker] Capture request for tab ${tabId}. Manual: ${!!streamId}`);

  // Store metadata for this tab
  if (meetingId !== '_popup_triggered_') {
    pendingCaptures.set(tabId, { meetingId, speakerId });
  }

  // If no streamId, we haven't been authorized via popup yet
  if (!streamId) {
    chrome.action.setBadgeText({ text: '!', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#F4A900', tabId });
    
    chrome.tabs.sendMessage(tabId, { 
      type: 'CAPTURE_STATUS', 
      status: 'NEED_GESTURE'
    }).catch(() => {});
    return;
  }

  // If we have a streamId (from popup), we proceed directly to offscreen
  console.log(`[ServiceWorker] Starting offscreen flow with streamId for tab ${tabId}`);
  
  // Use stored meeting details if popup sent placeholders
  let finalMeetingId = meetingId;
  let finalSpeakerId = speakerId;
  
  if (meetingId === '_popup_triggered_') {
    const pending = pendingCaptures.get(tabId);
    if (pending) {
      finalMeetingId = pending.meetingId;
      finalSpeakerId = pending.speakerId;
    } else {
      console.error('[ServiceWorker] No pending meeting data found for popup request');
      return { success: false, error: 'Reunião não detectada. Recarregue a página.' };
    }
  }

  try {
    await setupOffscreen();
    
    // Send to offscreen document
    chrome.runtime.sendMessage({
      type: 'START_RECORDING',
      streamId,
      meetingId: finalMeetingId,
      speakerId: finalSpeakerId
    });

    // Clear badge and notify success
    chrome.action.setBadgeText({ text: 'REC', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#C1666B', tabId });
    
    chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_STATUS', status: 'ACTIVE' }).catch(() => {});
    console.log('[ServiceWorker] Capture flow started successfully');
    return { success: true };
  } catch (err: any) {
    console.error('[ServiceWorker] Offscreen setup failed:', err);
    chrome.tabs.sendMessage(tabId, { type: 'CAPTURE_STATUS', status: 'ERROR', error: err.message }).catch(() => {});
    return { success: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Message router
// ---------------------------------------------------------------------------

chrome.runtime.onInstalled.addListener(() => {
  console.log('Polyglan Student extension installed');
});

chrome.runtime.onMessage.addListener((request: any, sender, sendResponse) => {
  // ----- Audio capture messages -----
  if (request.type === 'START_CAPTURE') {
    const { meetingId, speakerId, streamId, tabId: manualTabId } = request;
    const tabId = sender.tab?.id || manualTabId;

    if (!tabId) {
      sendResponse({ success: false, error: 'No tab ID found for capture' });
      return false;
    }

    initiateCapture(tabId, meetingId, speakerId, streamId).then(res => {
      if (res) sendResponse(res);
    });
    return true; // keep channel open
  }

  if ('type' in request && request.type === 'STOP_CAPTURE') {
    const tabId = sender.tab?.id;
    console.log('[ServiceWorker] STOP_CAPTURE received');
    
    if (tabId) pendingCaptures.delete(tabId);

    // Stop recording in offscreen and close it
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
    closeOffscreen().then(() => sendResponse({ success: true }));
    
    return true;
  }

  // ----- OAuth messages -----
  const authRequest = request as AuthMessage;

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

  return false;
});

// ---------------------------------------------------------------------------
// Google OAuth (Unchanged)
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
