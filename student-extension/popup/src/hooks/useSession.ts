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
  const [micGranted, setMicGranted] = useState<boolean>(false);

  const checkMicPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicGranted(result.state === 'granted');
      result.onchange = () => {
        setMicGranted(result.state === 'granted');
      };
    } catch (e) {
      // Fallback for browsers that don't support permissions.query for mic
      console.warn('Permissions API not supported for microphone', e);
    }
  }, []);

  useEffect(() => {
    checkMicPermission();

    // 1. Get initial state
    chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
      if (response) {
        setState(response);
      }
    });

    // 2. Listen for updates
    const listener = (message: any) => {
      if (message.type === 'SESSION_STATE_UPDATED') {
        setState(message.payload);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [checkMicPermission]);

  const unlockAudio = useCallback(async () => {
    console.log('[useSession] 🎙️ unlockAudio invoked');
    try {
      // 1. Trigger mic permission (gesture-based)
      console.log('[useSession] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('[useSession] ✅ getUserMedia success');
      
      stream.getTracks().forEach(t => t.stop());
      setMicGranted(true);

      // 2. Resume AudioContext (gesture-based)
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AudioContext) {
        console.log('[useSession] Resuming AudioContext...');
        const ctx = new AudioContext();
        await ctx.resume();
        console.log('[useSession] ✅ AudioContext ready');
      }
      return true;
    } catch (e) {
      console.error('[useSession] ❌ Failed to unlock audio:', e);
      setMicGranted(false);
      return false;
    }
  }, []);

  const login = useCallback(async () => {
    console.log('[useSession] 🔑 Login started');
    const unlocked = await unlockAudio();
    if (!unlocked) {
      console.warn('[useSession] Audio not unlocked, but proceeding with login attempt...');
    }
    
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage({ action: 'authenticateWithGoogle' }, (response) => {
        if (response?.success) {
          console.log('[useSession] ✅ Auth success');
          resolve(response.data);
        } else {
          console.error('[useSession] ❌ Auth failed:', response?.error);
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
    micGranted,
    login,
    logout,
    unlockAudio,
    isLoading: !state,
  };
}
