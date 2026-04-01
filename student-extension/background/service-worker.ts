/**
 * Service Worker for Polyglan Student Extension (Manifest V3)
 * 
 * Responsibilities:
 * - Handle Google OAuth authentication via chrome.identity.launchWebAuthFlow()
 * - Relay authorization code to FloatingPanel
 * 
 * Note: All WebSocket communication, Web Speech API, and backend logic
 * happens in the content-script/FloatingPanel, not here.
 */

chrome.runtime.onInstalled.addListener(() => {
  console.log('Polyglan Student extension installed');
});

// Handle Google authentication requests from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log(`[ServiceWorker] Received message: ${request.action}`);

  if (request.action === 'authenticateWithGoogle') {
    authenticateWithGoogle()
      .then((result) => {
        console.log('[ServiceWorker] Authentication successful');
        sendResponse({ success: true, data: result });
      })
      .catch((error) => {
        console.error('[ServiceWorker] Auth error:', error);
        sendResponse({ success: false, error: error.message || 'Authentication failed' });
      });
    return true; // Keep channel open for async response
  }

  // Handle ping for connection testing
  if (request.action === 'ping') {
    sendResponse({ success: true, pong: true });
    return false;
  }

  // Fallback for unhandled messages
  console.warn(`[ServiceWorker] Unhandled message action: ${request.action}`);
  sendResponse({ success: false, error: 'Unhandled action' });
  return false;
});

/**
 * Authenticate user with Google using Chrome Identity API
 * Opens a popup for the user to sign in with their Google account
 * Returns the authorization code which will be exchanged by the backend for an access token
 */
async function authenticateWithGoogle(): Promise<{ authCode: string }> {
  return new Promise((resolve, reject) => {
    // Google OAuth2 authorization URL
    // This will prompt the user to sign in and grant permissions
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    
    // Get extension ID to construct the redirect URI
    const extensionId = chrome.runtime.id;
    const redirectUri = `https://${extensionId}.chromiumapp.org/`;
    
    // Build authorization URL parameters
    authUrl.searchParams.append('client_id', chrome.runtime.getManifest().oauth2?.client_id || '');
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline');

    // Launch the authentication flow
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl.toString(),
        interactive: true,
      },
      (redirectUrl) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Auth flow failed: ${chrome.runtime.lastError.message}`));
          return;
        }

        if (!redirectUrl) {
          reject(new Error('Auth flow was cancelled'));
          return;
        }

        // Extract the authorization code from the redirect URL
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

        console.log('[ServiceWorker] Authorization code received');
        resolve({ authCode });
      }
    );
  });
}
