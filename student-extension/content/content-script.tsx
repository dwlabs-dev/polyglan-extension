import React from 'react';
import { createRoot } from 'react-dom/client';
import FloatingPanel from '../src/components/FloatingPanel';

// ---------------------------------------------------------------------------
// FloatingPanel injection (existing behaviour — unchanged)
// ---------------------------------------------------------------------------

const container = document.createElement('div');
container.id = 'polyglan-student-root';
document.body.appendChild(container);

const root = createRoot(container);
root.render(<FloatingPanel />);

console.log('Polyglan Student extension loaded');

// ---------------------------------------------------------------------------
// Audio capture orchestration
// ---------------------------------------------------------------------------

/**
 * Generate a simple RFC-4122 v4 UUID without external dependencies.
 * Service workers and content scripts don't have `crypto.randomUUID` in all
 * Chrome versions, so we implement a polyfill using `crypto.getRandomValues`.
 */
function generateUUID(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version (4) and variant bits per RFC 4122
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/**
 * Extract the meeting code from the current URL.
 * e.g. https://meet.google.com/abc-defg-hij  →  "abc-defg-hij"
 * Returns null when not on a meeting page.
 */
function extractMeetingId(): string | null {
  const match = window.location.pathname.match(/^\/([a-z]{3}-[a-z]{4}-[a-z]{3})/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Resolve the persistent speaker ID from chrome.storage.local.
 * If it is missing, a new UUID is generated and persisted.
 */
async function resolveSpeakerId(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get('polyglan_user_id', (result) => {
      if (result['polyglan_user_id']) {
        resolve(result['polyglan_user_id'] as string);
      } else {
        const newId = generateUUID();
        chrome.storage.local.set({ polyglan_user_id: newId }, () => {
          resolve(newId);
        });
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Meeting lifecycle detection via MutationObserver
//
// Strategy: Google Meet dynamically removes/adds specific landmark elements as
// the meeting progresses. The most reliable signals observed across Meet
// versions are:
//
//  • Active call: a `[data-meeting-title]` or `[jscontroller]` root element
//    with meeting controls is present in the DOM.
//  • Call ended / lobby: the element `c-wiz[data-is-call-ended="true"]` is
//    present, OR the pathname changes away from /xxx-yyy-zzz.
//
// We use a combination of:
//  1. `MutationObserver` on `document.body` (subtree) to detect attribute
//     and child-list mutations related to call state.
//  2. A lightweight hash/pathname observer (polling every 2s as fallback)
//     to catch SPA navigations that MutationObserver might miss.
// ---------------------------------------------------------------------------

const CALL_CONTROLS_SELECTOR = '[data-call-ended]';

let meetingActive = false;
let observer: MutationObserver | null = null;
let pathnamePoller: ReturnType<typeof setInterval> | null = null;

function isCallEnded(): boolean {
  const el = document.querySelector(CALL_CONTROLS_SELECTOR);
  if (!el) return false;
  return el.getAttribute('data-call-ended') === 'true';
}

function isOnMeetingPage(): boolean {
  return /^\/[a-z]{3}-[a-z]{4}-[a-z]{3}/i.test(window.location.pathname);
}

async function onMeetingStarted(): Promise<void> {
  if (meetingActive) return;
  meetingActive = true;

  const meetingId = extractMeetingId();
  if (!meetingId) {
    console.warn('[Polyglan CS] Could not extract meetingId — aborting capture');
    return;
  }

  const speakerId = await resolveSpeakerId();

  console.log(`[Polyglan CS] Meeting started — id=${meetingId}, speaker=${speakerId}`);

  chrome.runtime.sendMessage(
    { type: 'START_CAPTURE', meetingId, speakerId },
    (response: { success: boolean; error?: string } | undefined) => {
      if (chrome.runtime.lastError) {
        console.error('[Polyglan CS] sendMessage error:', chrome.runtime.lastError.message);
        return;
      }
      if (!response?.success) {
        console.error('[Polyglan CS] START_CAPTURE failed:', response?.error);
      } else {
        console.log('[Polyglan CS] Capture started successfully');
      }
    }
  );
}

function onMeetingEnded(): void {
  if (!meetingActive) return;
  meetingActive = false;

  console.log('[Polyglan CS] Meeting ended — stopping capture');

  chrome.runtime.sendMessage(
    { type: 'STOP_CAPTURE' },
    (response: { success: boolean } | undefined) => {
      if (chrome.runtime.lastError) {
        console.error('[Polyglan CS] STOP_CAPTURE sendMessage error:', chrome.runtime.lastError.message);
        return;
      }
      if (response?.success) {
        console.log('[Polyglan CS] Capture stopped successfully');
      }
    }
  );
}

function checkMeetingState(): void {
  if (!isOnMeetingPage()) {
    // Navigated away from meeting entirely
    if (meetingActive) onMeetingEnded();
    return;
  }

  if (isCallEnded()) {
    if (meetingActive) onMeetingEnded();
  } else {
    // On a meeting page and call is not ended → meeting is active
    if (!meetingActive) {
      // async — fire and forget (errors are logged internally)
      onMeetingStarted().catch((err: unknown) => {
        console.error('[Polyglan CS] onMeetingStarted error:', err);
      });
    }
  }
}

function startMeetingObserver(): void {
  // Initial check
  checkMeetingState();

  // MutationObserver for DOM changes
  observer = new MutationObserver(() => {
    checkMeetingState();
  });

  observer.observe(document.body, {
    subtree: true,
    attributes: true,
    attributeFilter: ['data-call-ended'],
    childList: true,
  });

  // Fallback poller for SPA navigations / hash changes (every 2s)
  pathnamePoller = setInterval(() => {
    checkMeetingState();
  }, 2000);
}

// Start observing once the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startMeetingObserver);
} else {
  startMeetingObserver();
}
