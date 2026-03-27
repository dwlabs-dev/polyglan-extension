import { useState, useEffect, useCallback } from 'react';
import type { Participant } from '../../../types';
import { getParticipants } from '../../../services/participants.service';

export function useModeSelector() {
  const [step, setStep] = useState<'selection' | 'active'>('selection');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // API Data
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch participants
  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const data = await getParticipants();
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

  const startMode = useCallback((modeName: string) => {
    setActiveMode(modeName);
    setStep('active');
    setIsPaused(false);
  }, []);

  const reset = useCallback(() => {
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
    setIsPaused,
    toggleParticipant,
    startMode,
    reset,
    formatTime,
    participants,
    loading,
    error,
  };
}
