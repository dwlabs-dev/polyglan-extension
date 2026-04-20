import { useState, useEffect, useCallback } from 'react';
import { SessionStatus, SessionMode, SupportedLang } from '../../../src/types/index';

export interface SessionState {
  status: SessionStatus;
  mode: SessionMode;
  modeSegmentId: string | null;
  studentId: string | null;
  sessionId: string | null;
  userName: string | null;
  googleEmail: string | null;
  lang: SupportedLang;
  interimTranscript: string;
  feedbackMessages: any[];
}

export function useSession() {
  const [state, setState] = useState<SessionState | null>(null);

  useEffect(() => {
    // 1. Get initial state
    chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
      if (response) {
        setState(response);
      }
    });

    // 2. Listen for updates
    const listener = (message: chrome.runtime.MessageMap) => {
      if (message.type === 'SESSION_STATE_UPDATED') {
        setState(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, []);

  const login = useCallback(async () => {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'authenticateWithGoogle' }, (response) => {
        if (response?.success) {
          // Note: Real authentication flow happens in Service Worker + Backend
          // We just wait for the state update from the Service Worker
          resolve(response.data);
        } else {
          reject(response?.error || 'Authentication failed');
        }
      });
    });
  }, []);

  const logout = useCallback(async () => {
    chrome.runtime.sendMessage({ action: 'STOP_RECORDING' }); // Ensure we stop anything
    // In a real app, we'd call a specific logout action
    // For now, we'll just let the service worker handle it
  }, []);

  return {
    state,
    login,
    logout,
    isLoading: !state,
  };
}
