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
const CALL_ENDED_SELECTOR = '[data-call-ended="true"]';

function isCallActive(): boolean {
  const isMeetingPage = /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(window.location.pathname);
  if (!isMeetingPage) return false;

  const callEndedEl = document.querySelector(CALL_ENDED_SELECTOR);
  return !callEndedEl;
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
      if (chrome.runtime.lastError) {
        console.error('[Polyglan CS] ❌ sendMessage error:', chrome.runtime.lastError.message);
        meetingActive = false; // Allow retry on next check
      } else {
        console.log('[Polyglan CS] ✅ START_RECORDING sent successfully. Response:', response);
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
