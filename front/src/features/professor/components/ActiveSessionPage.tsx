import type { Participant } from '../../../types';
import { SessionControls } from './SessionControls';

interface ActiveSessionPageProps {
  sessionId: string;
  activeMode: string;
  seconds: number;
  isPaused: boolean;
  onPauseToggle: () => void;
  onFinish: () => void;
  formatTime: (sec: number) => string;
  selectedParticipants: Participant[];
}

export default function ActiveSessionPage({
  activeMode,
  seconds,
  isPaused,
  onPauseToggle,
  onFinish,
  formatTime,
  selectedParticipants
}: Omit<ActiveSessionPageProps, 'sessionId'>) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-polyglan-cream text-polyglan-brown dark:bg-polyglan-brown-dark dark:text-polyglan-cream overflow-hidden">
      {/* Active Mode Badge */}
      <div className="animate-fade-in-up">
        <div className="px-5 py-2 bg-polyglan-primary text-polyglan-brown rounded-full text-[10px] font-display font-black uppercase tracking-[0.2em] shadow-lg shadow-polyglan-primary/20 mb-8 border border-white/20">
          Atividade: {activeMode}
        </div>
      </div>

      {/* Hero Timer */}
      <div className="flex flex-col items-center mb-10 animate-fade-in-up stagger-1">
        <div className="text-8xl font-display font-black tracking-tighter tabular-nums text-polyglan-brown leading-none filter drop-shadow-sm">
          {formatTime(seconds)}
        </div>
        <div className="flex items-center gap-2 mt-4">
           <span className={`w-2 h-2 rounded-full ${isPaused ? 'bg-polyglan-secondary' : 'bg-green-500 animate-pulse'}`}></span>
           <span className="text-[10px] font-black uppercase tracking-widest text-polyglan-muted">
             {isPaused ? 'SESSÃO PAUSADA' : 'SESSÃO EM CURSO'}
           </span>
        </div>
      </div>

      {/* Participants Horizontal List */}
      <div className="w-full flex flex-col items-center gap-3 animate-fade-in-up stagger-2">
        <h3 className="text-[9px] font-black uppercase tracking-[0.25em] text-polyglan-muted opacity-50">
          Alunos na Atividade
        </h3>
        <div className="flex flex-wrap justify-center gap-x-2 gap-y-2 max-w-[280px]">
          {selectedParticipants.map((u) => (
            <div key={u.conferenceRecordUserId} className="flex items-center">
              <span className="text-[11px] font-bold text-polyglan-brown/80 bg-white/60 px-3 py-1 rounded-full border border-polyglan-beige/20 shadow-sm">
                {u.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Controls Container */}
      <div className="w-full max-w-[320px]">
        <SessionControls
          activeMode={activeMode}
          isPaused={isPaused}
          onPauseToggle={onPauseToggle}
          onFinish={onFinish}
          onStartMode={() => {}} 
        />
      </div>
    </div>
  );
}

