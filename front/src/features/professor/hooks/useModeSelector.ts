import { useState, useEffect, useCallback } from 'react';
import { socketService } from '../../../services/socket.service';
import { useParticipantPresence } from '../../professor/hooks/useParticipantPresence';
import { getParticipants } from '../../../services/participants.service';
import { startSession } from '../../../services/session.service';
import { useAuth } from '../../../hooks/useAuth';
import type { Participant, Mode } from '../../../types';

export function useModeSelector() {
  const { getAuthHeader, userId, meetingId } = useAuth();
  const [step, setStep] = useState<'selection' | 'active'>('selection');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');

  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Callbacks for presence tracking
  const handleParticipantOnline = useCallback((user: { userId: string, name?: string }) => {
    setParticipants(prev => {
      // Check if user already exists in the list
      const exists = prev.some(
        p => p.googleUserId === user.userId || p.conferenceRecordUserId === user.userId
      );

      if (exists) return prev;



      // If not, add dynamically
      const newParticipant: Participant = {
        name: user.name || `User ${user.userId.substring(0, 4)}...`,
        googleUserId: user.userId,
        conferenceRecordUserId: user.userId, // Use googleUserId as fallback
        isDynamic: true // Flag to identify dynamically added users
      } as any;

      return [...prev, newParticipant];
    });
  }, []);

  const handleParticipantOffline = useCallback((user: { userId: string, name?: string }) => {
    // Optionally remove dynamically added participants if they go offline
    setParticipants(prev => {
      return prev.filter(p => {
        // Keep them if they are from the original Meet API list (not dynamic)
        if (!(p as any).isDynamic) return true;

        // Remove if they were dynamically added and match the offline user
        return p.googleUserId !== user.userId && p.conferenceRecordUserId !== user.userId;
      });
    });
  }, []);

  // Presence tracking
  const { onlineUserIds, onlineNames } = useParticipantPresence(
    sessionId,
    handleParticipantOnline,
    handleParticipantOffline
  );

  const fetchParticipants = useCallback(async () => {
    try {
      setLoading(true);
      const { Authorization } = getAuthHeader();
      const data = await getParticipants(Authorization);

      if (data.status === 'success') {
        // Merge with any dynamically added participants we might already have
        setParticipants(prev => {
          const dynamicUsers = prev.filter(p => (p as any).isDynamic);

          // Map the fetched data
          const fetchedUsers = data.participants;

          // Re-add dynamic users that weren't returned by the API
          const newDynamic = dynamicUsers.filter(dyn =>
            !fetchedUsers.some(f =>
              f.googleUserId === dyn.googleUserId ||
              f.conferenceRecordUserId === dyn.conferenceRecordUserId ||
              f.name === dyn.name
            )
          );

          return [...fetchedUsers, ...newDynamic];
        });
      } else {
        setError(data.message || 'Falha ao carregar participantes.');
      }
    } catch (e) {
      setError('Erro de conexão com o servidor.');
    } finally {
      setLoading(false);
    }
  }, [getAuthHeader]);

  // Fetch participants
  useEffect(() => {
    fetchParticipants();
  }, [fetchParticipants]);

  // Connect to WebSocket and sync meeting code
  useEffect(() => {
    const initSocket = async () => {

      if (!userId)
        return;

      setSessionId(meetingId as string);

      const wsBaseUrl = import.meta.env.VITE_WS_URL;
      let wsUrl = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl.replace(/\/$/, '')}/ws`;

      // Enforce WSS if on an HTTPS page (Google Meet requirement)
      if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
        wsUrl = wsUrl.replace('ws://', 'wss://');
      }

      socketService.connect(wsUrl, (meetingId as string), (userId as string));

      // Request initial presence after a short delay to ensure connection is fully established
      setTimeout(() => {
        socketService.send('REQUEST_PRESENCE', {});
      }, 500);
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
    togglePause,
    refreshParticipants: fetchParticipants
  };
}
