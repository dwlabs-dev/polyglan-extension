import React, { useState, useEffect } from 'react';
import { getLiveParticipants } from '@services/participants.service';
import { startSession } from '@services/session.service';
import type { Participant } from '@types';

type AppState = 'selection' | 'active';
type ActivityMode = 'História' | 'Debate';

export const MeetingManager: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [step, setStep] = useState<AppState>('selection');
  const [activeMode, setActiveMode] = useState<ActivityMode | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        const response = await getLiveParticipants();
        if (response.status === 'success') {
          setParticipants(response.participants);
        }
      } catch (error) {
        console.error('Error fetching participants:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchParticipants();
  }, []);

  useEffect(() => {
    let interval: any;
    if (isActive && step === 'active') {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, step]);

  const toggleUser = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const handleStart = async (mode: ActivityMode) => {
    setActiveMode(mode);
    setStep('active');
    setSeconds(0);
    setIsActive(true);

    try {
      console.log(`[MeetingManager] Starting backend session for ${mode}...`);
      const backendMode = mode === 'Debate' ? 'debate' : 'history';
      await startSession(backendMode, Array.from(selectedIds));
    } catch (error) {
      console.error('[MeetingManager] Failed to start backend session:', error);
    }
  };

  const resetSession = () => {
    setStep('selection');
    setActiveMode(null);
    setIsActive(false);
    setSeconds(0);
  };

  const togglePause = () => {
    setIsActive(!isActive);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-polyglan-cream dark:bg-polyglan-brown-dark text-polyglan-brown dark:text-polyglan-cream">
        <span className="animate-pulse font-display font-bold tracking-widest text-[10px] uppercase">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-polyglan-cream text-polyglan-brown font-sans antialiased overflow-hidden dark:bg-polyglan-brown-dark dark:text-polyglan-cream">
      {/* Header Minimalista */}
      <header className="flex items-center justify-between p-5 bg-white dark:bg-polyglan-brown border-b border-polyglan-beige dark:border-polyglan-brown-dark">
        <h1 className="text-[14px] font-display font-black tracking-[0.1em] uppercase">Polyglan</h1>
        <div className="w-1.5 h-1.5 rounded-full bg-polyglan-primary"></div>
      </header>

      {step === 'selection' ? (
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Listagem Compacta */}
          <div className="flex-grow overflow-y-auto p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-polyglan-muted dark:text-polyglan-beige-light mb-4">
              Participantes ({participants.length})
            </h2>

            <div className="space-y-2">
              {participants.map((user) => (
                <div
                  key={user.conferenceRecordUserId}
                  onClick={() => toggleUser(user.conferenceRecordUserId)}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-colors duration-200 border 
                    ${selectedIds.has(user.conferenceRecordUserId)
                      ? 'bg-white border-polyglan-primary shadow-sm dark:bg-polyglan-brown dark:border-polyglan-primary'
                      : 'bg-polyglan-beige/20 border-transparent hover:bg-white dark:bg-polyglan-brown/50 dark:hover:bg-polyglan-brown'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-polyglan-brown flex items-center justify-center text-polyglan-cream dark:bg-polyglan-brown-dark dark:border dark:border-polyglan-beige text-xs font-bold mr-3">
                    {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : '?'}
                  </div>
                  <span className="text-sm font-medium flex-grow">{user.name}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors
                    ${selectedIds.has(user.conferenceRecordUserId) ? 'border-polyglan-primary bg-polyglan-primary' : 'border-polyglan-muted dark:border-polyglan-beige-light'}`}>
                    {selectedIds.has(user.conferenceRecordUserId) && <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-polyglan-brown-dark"></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé de Ações Fixo */}
          {selectedIds.size > 0 && (
            <footer className="p-6 bg-white dark:bg-polyglan-brown border-t border-polyglan-beige dark:border-polyglan-brown-dark">
              <button
                onClick={() => handleStart('História')}
                className="w-full py-4 mb-3 rounded-full bg-polyglan-primary text-polyglan-brown-dark font-display font-bold text-[11px] uppercase tracking-widest active:scale-[0.98] hover:bg-polyglan-primary/90 transition-all cursor-pointer"
              >
                Iniciar História
              </button>

              {selectedIds.size >= 2 && (
                <button
                  onClick={() => handleStart('Debate')}
                  className="w-full py-4 rounded-full bg-white text-polyglan-brown border-2 border-polyglan-brown dark:bg-polyglan-brown dark:text-polyglan-cream dark:border-polyglan-beige font-display font-bold text-[11px] uppercase tracking-widest active:scale-[0.98] hover:bg-polyglan-beige/10 transition-all cursor-pointer"
                >
                  Modo Debate
                </button>
              )}
            </footer>
          )}
        </div>
      ) : (
        /* Tela de Atividade (Foco Total) */
        <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in slide-in-from-bottom-2 duration-700">
          <div className="px-3 py-1 border-2 border-polyglan-brown dark:border-polyglan-cream rounded-full text-[10px] font-display font-black uppercase tracking-widest mb-4">
            {activeMode}
          </div>

          <div className="text-[72px] font-display font-light tracking-tighter my-4 tabular-nums">
            {formatTime(seconds)}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px] font-bold text-polyglan-muted dark:text-polyglan-beige-light opacity-80 uppercase tracking-tighter">
            {participants
              .filter(u => selectedIds.has(u.conferenceRecordUserId))
              .map((u, i, arr) => (
                <span key={u.conferenceRecordUserId} className="flex items-center">
                  {u.name} {i < arr.length - 1 && <span className="mx-2 opacity-50">•</span>}
                </span>
              ))}
          </div>

          <div className="flex mt-12 gap-8">
            <button onClick={togglePause} className="text-[11px] font-display font-black uppercase tracking-widest hover:opacity-60 transition-opacity cursor-pointer">
              {!isActive ? "Retomar" : "Pausar"}
            </button>
            <button onClick={resetSession} className="text-[11px] font-display font-black uppercase tracking-widest text-polyglan-secondary hover:opacity-60 transition-opacity cursor-pointer">
              Finalizar
            </button>
          </div>
        </div>
      )}

      <style>{`
        .animate-in {
          animation: fadeIn 0.7s ease-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default MeetingManager;
