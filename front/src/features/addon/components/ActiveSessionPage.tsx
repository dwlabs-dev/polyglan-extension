import type { Participant } from '../../../types';
import { SessionControls } from '../../professor/components/SessionControls';

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
    <div className="flex flex-col items-center justify-center h-full p-8 bg-polyglan-cream text-polyglan-brown dark:bg-polyglan-brown-dark dark:text-polyglan-cream animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="px-4 py-1.5 border-2 border-polyglan-brown dark:border-polyglan-cream rounded-full text-[11px] font-display font-black uppercase tracking-widest mb-6">
        {activeMode}
      </div>
      <div className="text-[88px] font-display font-light tracking-tighter tabular-nums mb-4">
        {formatTime(seconds)}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {selectedParticipants.map((u, i, arr) => (
          <span key={u.conferenceRecordUserId} className="text-[12px] font-bold text-polyglan-muted dark:text-polyglan-beige-light tracking-tighter flex items-center">
            {u.name.toUpperCase()} {i < arr.length - 1 && <span className="mx-2 opacity-50">•</span>}
          </span>
        ))}
      </div>
      <SessionControls
        activeMode={activeMode}
        isPaused={isPaused}
        onPauseToggle={onPauseToggle}
        onFinish={onFinish}
        onStartMode={() => {}} // Not used in this screen but required by component for now
      />
    </div>
  );
}
