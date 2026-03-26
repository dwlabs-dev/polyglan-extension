import React, { useState, useEffect } from 'react';
import { getLiveParticipants } from '../../../services/participants.service';
import type { Participant } from '../../../types';

type AppState = 'Selection' | 'Active';
type ActivityMode = 'História' | 'Debate';

export const MeetingManager: React.FC = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [appState, setAppState] = useState<AppState>('Selection');
  const [activeMode, setActiveMode] = useState<ActivityMode | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        // Try to get meetingCode from URL params (common for Meet Add-ons)
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
    if (isActive && appState === 'Active') {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, appState]);

  const toggleSelection = (userId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(userId)) {
      newSelected.delete(userId);
    } else {
      newSelected.add(userId);
    }
    setSelectedIds(newSelected);
  };

  const startSession = (mode: ActivityMode) => {
    setActiveMode(mode);
    setAppState('Active');
    setTimeLeft(0);
    setIsActive(true);
  };

  const finishSession = () => {
    setAppState('Selection');
    setActiveMode(null);
    setIsActive(false);
    setTimeLeft(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#FCFCF4] text-[#000000]">
        <span className="animate-pulse">Carregando...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full max-w-[400px] bg-[#FCFCF4] text-[#000000] font-sans overflow-hidden border-x border-[#999999]">
      {appState === 'Selection' ? (
        <div className="flex flex-col h-full p-4 animate-fadeIn">
          <header className="mb-6">
            <h1 className="text-xl font-semibold tracking-tight">Gerenciar Atividade</h1>
            <p className="text-sm text-[#999999]">Selecione os participantes</p>
          </header>

          <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2">
            {participants.map((p) => {
              const isSelected = selectedIds.has(p.conferenceRecordUserId);
              return (
                <div
                  key={p.conferenceRecordUserId}
                  onClick={() => toggleSelection(p.conferenceRecordUserId)}
                  className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected ? 'bg-[#F4F4EC] ring-1 ring-[#000000]/10' : 'hover:bg-[#F4F4EC]/50'
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-[#000000] text-[#FCFCF4] flex items-center justify-center text-xs font-medium">
                    {p.name.charAt(0).toUpperCase()}
                  </div>
                  <span className={`text-sm flex-1 ${isSelected ? 'font-medium' : 'font-light'}`}>
                    {p.name}
                  </span>
                  <div
                    className={`w-4 h-4 rounded-full border border-[#999999] flex items-center justify-center transition-colors ${
                      isSelected ? 'bg-[#000000] border-[#000000]' : ''
                    }`}
                  >
                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 mt-auto pt-4 border-t border-[#F4F4EC]">
            {selectedIds.size >= 1 && (
              <button
                onClick={() => startSession('História')}
                className="w-full py-3 bg-[#000000] text-[#FCFCF4] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
              >
                Iniciar História
              </button>
            )}
            {selectedIds.size >= 2 && (
              <button
                onClick={() => startSession('Debate')}
                className="w-full py-3 border border-[#000000] text-[#000000] rounded-full text-sm font-medium hover:bg-[#F4F4EC] transition-all"
              >
                Modo Debate
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full p-4 animate-slideUp">
          <div className="flex justify-center mb-8">
            <span className="px-3 py-1 bg-[#F4F4EC] text-[10px] uppercase tracking-widest font-bold border border-[#999999]/20 rounded-full">
              {activeMode} Ativo
            </span>
          </div>

          <div className="flex flex-col items-center justify-center flex-1">
            <div className="text-6xl font-light tracking-tighter mb-4 tabular-nums">
              {formatTime(timeLeft)}
            </div>
            <div className="text-xs text-[#999999] text-center max-w-[200px] leading-relaxed">
              {participants
                .filter((p) => selectedIds.has(p.conferenceRecordUserId))
                .map((p) => p.name)
                .join(' • ')}
            </div>
          </div>

          <div className="flex gap-3 mt-auto pt-4">
            <button
              onClick={() => setIsActive(!isActive)}
              className="flex-1 py-3 bg-[#000000] text-[#FCFCF4] rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
            >
              {isActive ? 'Pausar' : 'Retomar'}
            </button>
            <button
              onClick={finishSession}
              className="flex-1 py-3 border border-[#999999] text-[#000000] rounded-full text-sm font-medium hover:bg-[#F4F4EC] transition-all"
            >
              Finalizar
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease-out; }
        .animate-slideUp { animation: slideUp 0.4s ease-out; }
      `}</style>
    </div>
  );
};

export default MeetingManager;
