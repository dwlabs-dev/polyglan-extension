import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { SessionStatus, SessionMode, SupportedLang } from '../../../src/types/index';

export interface SessionData {
  status: SessionStatus;
  mode: SessionMode;
  modeSegmentId: string | null;
  studentId: string | null;
  sessionId: string | null;
  userName: string | null;
  googleEmail: string | null;
  lang: SupportedLang;
}

export interface SessionTranscript {
  interimTranscript: string;
}

export interface SessionFeedback {
  feedbackMessages: any[];
}

export interface SessionActions {
  login: () => Promise<void>;
  logout: () => Promise<void>;
  unlockAudio: () => Promise<void>;
}

interface SessionContextValue {
  data: SessionData | null;
  transcript: string;
  feedback: any[];
  micGranted: boolean;
  isLoading: boolean;
  actions: SessionActions;
}

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<SessionData | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [feedback, setFeedback] = useState<any[]>([]);
  const [micGranted, setMicGranted] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkMicPermission = useCallback(async () => {
    try {
      const result = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      setMicGranted(result.state === 'granted');
      result.onchange = () => {
        setMicGranted(result.state === 'granted');
      };
    } catch (e) {
      console.warn('Permissions API not supported for microphone', e);
    }
  }, []);

  const login = useCallback(async () => {
    // Implementation for login
    // For now, we just send a message to the background script
    chrome.runtime.sendMessage({ action: 'LOGIN' }, () => {
        // The background script will send SESSION_STATE_UPDATED
    });
  }, []);

  const logout = useCallback(async () => {
    chrome.runtime.sendMessage({ action: 'LOGOUT' }, () => {
        // The background script will send SESSION_STATE_UPDATED
    });
  }, []);

  const unlockAudio = useCallback(async () => {
    chrome.runtime.sendMessage({ action: 'UNLOCK_AUDIO' });
  }, []);

  const actions = useMemo(() => ({ login, logout, unlockAudio }), [login, logout, unlockAudio]);

  useEffect(() => {
    checkMicPermission();

    // 1. Get initial state
    chrome.runtime.sendMessage({ action: 'GET_STATE' }, (response) => {
      if (response) {
        const { interimTranscript, feedbackMessages, ...dataPart } = response;
        setData(dataPart);
        setTranscript(interimTranscript);
        setFeedback(feedbackMessages);
      }
      setIsLoading(false);
    });

    // 2. Listen for updates
    const listener = (message: any) => {
      if (message.type === 'SESSION_STATE_UPDATED') {
        const payload = message.payload;
        const { interimTranscript, feedbackMessages, ...dataPart } = payload;

        setTranscript(interimTranscript);
        setFeedback(feedbackMessages);
        setData(dataPart);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [checkMicPermission]);

  const value = useMemo(() => ({
    data,
    transcript,
    feedback,
    micGranted,
    isLoading,
    actions
  }), [data, transcript, feedback, micGranted, isLoading, actions]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
};

export const useSessionData = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionData must be used within SessionProvider');
  return context.data;
};

export const useSessionTranscript = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionTranscript must be used within SessionProvider');
  return context.transcript;
};

export const useSessionFeedback = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionFeedback must be used within SessionProvider');
  return context.feedback;
};

export const useSessionActions = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionActions must be used within SessionProvider');
  return context.actions;
};

export const useMicPermission = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useMicPermission must be used within SessionProvider');
  return context.micGranted;
};

export const useSessionStatus = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionStatus must be used within SessionProvider');
  return context.data?.status ?? null;
};

export const useSessionLoading = () => {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSessionLoading must be used within SessionProvider');
  return context.isLoading;
};

// For backward compatibility
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession must be used within SessionProvider');

  return {
    state: context.data,
    micGranted: context.micGranted,
    login: context.actions.login,
    logout: context.actions.logout,
    isLoading: context.isLoading,
    unlockAudio: context.actions.unlockAudio,
    // Adding these for completeness if they were used by components in App.tsx
    interimTranscript: context.transcript,
    feedbackMessages: context.feedback,
  };
}
