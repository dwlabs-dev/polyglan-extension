/**
 * Polyglan Student — Content Script (Observer)
 * 
 * Lightweight script to detect Google Meet lifecycle events 
 * and notify the background Service Worker.
 * 
 * DESIGN DECISION: All UI has been moved to the extension Popup
 * to ensure a clean student view and centralized interaction.
 */

console.log('[Polyglan CS] Extension observer loaded');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function extractMeetingId(): string | null {
  const match = window.location.pathname.match(/^\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

async function resolveSpeakerId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('polyglan_user_id', (result) => {
      if (result['polyglan_user_id']) {
        resolve(result['polyglan_user_id'] as string);
      } else {
        const newId = crypto.randomUUID?.() || Date.now().toString(); // Fallback for old Chrome
        chrome.storage.local.set({ polyglan_user_id: newId }, () => {
          resolve(newId);
        });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// State and Observation
// ---------------------------------------------------------------------------

let meetingActive = false;
function isCallActive(): boolean {
  const isMeetingPage = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(window.location.pathname);
  if (!isMeetingPage) return false;

  // 1. Check for specific Google data attribute (sometimes present)
  const callEndedEl = document.querySelector('[data-call-ended="true"]');
  if (callEndedEl) return false;

  // 2. Check for "You left the meeting" or "Rejoin" UI elements
  // We look for common text indicators that appear when a session is truly over
  const bodyText = document.body.innerText;
  const exitIndicators = [
    'You left the meeting',
    'Você saiu da reunião',
    'The meeting has ended',
    'rejoin',
    'participar novamente',
    'return to home screen',
    'voltar à tela inicial'
  ];

  const hasExitText = exitIndicators.some(text => bodyText.toLowerCase().includes(text.toLowerCase()));
  if (hasExitText) return false;

  // 3. Verify presence of minimum Meet UI (if screen is not empty)
  // This helps when navigating between lobby and room
  const meetControls = document.querySelector('[data-is-muted]');
  const chatButton = document.querySelector('[aria-label*="Chat"]');

  // If we are on a meeting URL but none of these exist AND we see exit text, it's definitely ended.
  return true;
}

async function notifyMeetingStarted(): Promise<void> {
  if (meetingActive) return;
  meetingActive = true;

  const meetingId = extractMeetingId();
  if (!meetingId) {
    console.warn('[Polyglan CS] Could not extract meetingId from URL:', window.location.pathname);
    meetingActive = false;
    return;
  }

  const speakerId = await resolveSpeakerId();
  console.log(`[Polyglan CS] 🚀 Meeting started! Sending START_RECORDING...`, { meetingId, speakerId });
  chrome.runtime.sendMessage(
    { type: 'START_RECORDING', meetingId, speakerId },
    (response) => {

      if (chrome.runtime.lastError || (response && !response.success)) {
        console.warn('[Polyglan CS] ❌ START_RECORDING failed. Will retry on next observer cycle:',
          chrome.runtime.lastError?.message || response?.error);
        meetingActive = false; // Reset to allow retry on next poll/mutation
      } else {
        console.log('[Polyglan CS] ✅ START_RECORDING initiated successfully.');
      }
    }
  );
}

function notifyMeetingEnded(): void {
  if (!meetingActive) return;
  meetingActive = false;

  console.log('[Polyglan CS] 🛑 Meeting ended. Sending STOP_RECORDING...');
  chrome.runtime.sendMessage({ type: 'STOP_RECORDING' }, (response) => {
    if (chrome.runtime.lastError) {
      console.warn('[Polyglan CS] STOP_RECORDING error:', chrome.runtime.lastError.message);
    } else {
      console.log('[Polyglan CS] ✅ STOP_RECORDING sent successfully.');
    }
  });
}

function checkState(): void {
  const active = isCallActive();

  if (active) {
    if (!meetingActive) {
      console.log(`[Polyglan CS] 📹 Meeting detected: ${window.location.pathname}`);
    }
    notifyMeetingStarted().catch(err => console.error('[Polyglan CS] notifyMeetingStarted failed:', err));
  } else {
    if (meetingActive) {
      console.log('[Polyglan CS] 🛑 Meeting ended.');
    }
    notifyMeetingEnded();
  }
}

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

const observer = new MutationObserver(() => checkState());

function init() {
  checkState();
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['data-call-ended']
  });

  // Polling fallback for SPA navigations
  setInterval(checkState, 3000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
