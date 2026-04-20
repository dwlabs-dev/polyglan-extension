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

  const unlockAudio = useCallback(async () => {
    try {
      // 1. Trigger mic permission (gesture-based)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());

      // 2. Resume AudioContext (gesture-based)
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        const ctx = new AudioContext();
        await ctx.resume();
      }
      return true;
    } catch (e) {
      console.warn('Failed to unlock audio from gesture:', e);
      return false;
    }
  }, []);

  const login = useCallback(async () => {
    await unlockAudio(); // Trigger gesture-based unlock
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'authenticateWithGoogle' }, (response) => {
        if (response?.success) {
          resolve(response.data);
        } else {
          reject(response?.error || 'Authentication failed');
        }
      });
    });
  }, [unlockAudio]);

  const logout = useCallback(async () => {
    chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
  }, []);

  return {
    state,
    login,
    logout,
    unlockAudio,
    isLoading: !state,
  };
}
