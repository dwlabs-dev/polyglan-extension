import { useState, useEffect, useCallback } from 'react';
import { getMeetSession } from '../../../lib/meet';
import { socketService } from '../../../services/socket.service';
import { useParticipantPresence } from '../../professor/hooks/useParticipantPresence';
import { getParticipants } from '../../../services/participants.service';
import { startSession } from '../../../services/session.service';
import { useAuth } from '../../../hooks/useAuth';
import type { Participant, Mode } from '../../../types';

export function useModeSelector() {
  const { getAuthHeader, userId } = useAuth();
  const [step, setStep] = useState<'selection' | 'active'>('selection');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string>('default-session');

  // Presence tracking
  const { onlineUserIds, onlineNames } = useParticipantPresence(sessionId);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const { Authorization } = getAuthHeader();
        const data = await getParticipants(Authorization);
        if (data.status === 'success') {
          setParticipants(data.participants);
        } else {
          setError(data.message || 'Falha ao carregar participantes.');
        }
      } catch (e) {
        setError('Erro de conexão com o servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, [getAuthHeader]);

  // Connect to WebSocket and sync meeting code
  useEffect(() => {
    const initSocket = async () => {
      let meetingCode = 'default-session';
      try {
        const session = await getMeetSession();
        const meetingInfo = await session.getMeetingInfo();
        if (meetingInfo && meetingInfo.meetingCode) {
          meetingCode = meetingInfo.meetingCode;
        }
      } catch (e) {
        console.warn('[useModeSelector] Failed to get meetingCode from SDK, falling back to URL');
        const path = window.location.pathname.replace('/', '');
        if (path.length >= 10 && path.includes('-')) {
          meetingCode = path;
        }
      }

      setSessionId(meetingCode);
      debugger;
      const professorId = userId || 'professor-anonymous';
      const wsBaseUrl = import.meta.env.VITE_WS_URL;
      let wsUrl = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl.replace(/\/$/, '')}/ws`;

      // Enforce WSS if on an HTTPS page (Google Meet requirement)
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'wss://');
      }

      socketService.connect(wsUrl, meetingCode, professorId);
    };

    initSocket();

    return () => {
      socketService.disconnect();
    };
  }, []);

  // Timer logic
  useEffect(() => {
    let timer: number | undefined;
    if (step === 'active' && !isPaused) {
      timer = window.setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => {
      if (timer) window.clearInterval(timer);
    };
  }, [step, isPaused]);

  const toggleParticipant = useCallback((id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  }, []);

  const startMode = useCallback(async (modeName: Mode) => {
    setActiveMode(modeName);
    setStep('active');
    setIsPaused(false);

    try {
      console.log(`[useModeSelector] Triggering backend session for ${modeName}...`);
      const response = await startSession(modeName, selectedIds);
      if (response.status === 'success' && response.type) {
        socketService.send('START_MODE', { mode: modeName.toUpperCase() });
      }
    } catch (e) {
      console.error('[useModeSelector] Failed to initialize backend session:', e);
    }
  }, [selectedIds, sessionId]);

  const togglePause = useCallback(() => {
    const nextPaused = !isPaused;
    setIsPaused(nextPaused);
    if (nextPaused) {
      socketService.send('PAUSE_MODE', {});
    } else {
      socketService.send('START_MODE', { mode: activeMode?.toUpperCase() || 'DEBATE' });
    }
  }, [isPaused, activeMode]);

  const reset = useCallback(() => {
    socketService.send('STOP_MODE', {});
    setStep('selection');
    setSelectedIds([]);
    setActiveMode(null);
    setSeconds(0);
    setIsPaused(false);
  }, []);

  const formatTime = useCallback((s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    step,
    selectedIds,
    activeMode,
    seconds,
    isPaused,
    onlineUserIds,
    onlineNames,
    sessionId,
    toggleParticipant,
    startMode,
    reset,
    formatTime,
    participants,
    loading,
    error,
    togglePause
  };
}
