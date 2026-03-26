import React, { useState, useEffect } from 'react';
import { getLiveParticipants } from '../../../services/participants.service';
import type { Participant } from '../../../types';

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
        const params = new URLSearchParams(window.location.search);
        const meetingCode = params.get('meetingCode') || ''; 
        
        const response = await getLiveParticipants(meetingCode);
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

  const handleStart = (mode: ActivityMode) => {
    setActiveMode(mode);
    setStep('active');
    setSeconds(0);
    setIsActive(true);
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
      <div className="flex items-center justify-center h-screen bg-[#FCFCF4] text-[#000000]">
        <span className="animate-pulse font-bold tracking-widest text-[10px] uppercase">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-[#FCFCF4] text-[#000000] font-sans antialiased overflow-hidden">
      {/* Header Minimalista */}
      <header className="flex items-center justify-between p-5 bg-white border-b border-[#F0EEE6]">
        <h1 className="text-[14px] font-bold tracking-[0.1em] uppercase">Polyglan</h1>
        <div className="w-1.5 h-1.5 rounded-full bg-black"></div>
      </header>

      {step === 'selection' ? (
        <div className="flex flex-col flex-grow overflow-hidden">
          {/* Listagem Compacta */}
          <div className="flex-grow overflow-y-auto p-5">
            <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#999999] mb-4">
              Participantes ({participants.length})
            </h2>
            
            <div className="space-y-2">
              {participants.map((user) => (
                <div 
                  key={user.conferenceRecordUserId}
                  onClick={() => toggleUser(user.conferenceRecordUserId)}
                  className={`flex items-center p-3 rounded-xl cursor-pointer transition-all border 
                    ${selectedIds.has(user.conferenceRecordUserId) 
                      ? 'bg-white border-black shadow-sm' 
                      : 'bg-[#F4F4EC] border-transparent'}`}
                >
                  <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center text-[#FCFCF4] text-xs font-bold mr-3">
                    {user.name[0]}
                  </div>
                  <span className="text-sm font-medium flex-grow">{user.name}</span>
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center 
                    ${selectedIds.has(user.conferenceRecordUserId) ? 'border-black bg-black' : 'border-[#999999]'}`}>
                    {selectedIds.has(user.conferenceRecordUserId) && <div className="w-1.5 h-1.5 rounded-full bg-white"></div>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé de Ações Fixo */}
          {selectedIds.size > 0 && (
            <footer className="p-6 bg-white border-t border-[#F0EEE6]">
              <button 
                onClick={() => handleStart('História')}
                className="w-full py-4 mb-3 rounded-full bg-black text-white font-bold text-[11px] uppercase tracking-widest active:scale-95 transition-all"
              >
                Iniciar História
              </button>
              
              {selectedIds.size >= 2 && (
                <button 
                  onClick={() => handleStart('Debate')}
                  className="w-full py-4 rounded-full bg-white text-black border border-black font-bold text-[11px] uppercase tracking-widest active:scale-95 transition-all"
                >
                  Modo Debate
                </button>
              )}
            </footer>
          )}
        </div>
      ) : (
        /* Tela de Atividade (Foco Total) */
        <div className="flex flex-col items-center justify-center h-full p-8 animate-in fade-in duration-700">
          <div className="px-3 py-1 border border-black rounded-full text-[10px] font-bold uppercase tracking-widest mb-4">
            {activeMode}
          </div>
          
          <div className="text-[72px] font-light tracking-tighter my-4 tabular-nums">
            {formatTime(seconds)}
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-4 text-[11px] font-medium opacity-50 uppercase tracking-tighter">
            {participants
              .filter(u => selectedIds.has(u.conferenceRecordUserId))
              .map((u, i, arr) => (
                <span key={u.conferenceRecordUserId}>
                  {u.name}{i < arr.length - 1 ? " • " : ""}
                </span>
              ))}
          </div>

          <div className="flex mt-12 gap-8">
            <button onClick={togglePause} className="text-[11px] font-bold uppercase tracking-widest hover:opacity-50">
              {!isActive ? "Retomar" : "Pausar"}
            </button>
            <button onClick={resetSession} className="text-[11px] font-bold uppercase tracking-widest text-red-600 hover:opacity-50">
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
