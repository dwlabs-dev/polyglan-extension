import { ADDON_UI_TEXT } from '../constants';
import type { Participant } from '../../../types';

interface ActiveSessionPageProps {
  activeMode: string;
  seconds: number;
  isPaused: boolean;
  setIsPaused: (val: boolean) => void;
  reset: () => void;
  formatTime: (sec: number) => string;
  selectedParticipants: Participant[];
}

export default function ActiveSessionPage({
  activeMode,
  seconds,
  isPaused,
  setIsPaused,
  reset,
  formatTime,
  selectedParticipants
}: ActiveSessionPageProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-[#FCFCF4] text-black dark:bg-[#0F172A] dark:text-[#F8FAFC] animate-in fade-in duration-500">
      <div className="px-4 py-1.5 border-2 border-black dark:border-white rounded-full text-[11px] font-black uppercase tracking-widest mb-6">
        {activeMode}
      </div>
      <div className="text-[88px] font-light tracking-tighter tabular-nums mb-4">
        {formatTime(seconds)}
      </div>
      <div className="flex flex-wrap justify-center gap-3 mt-4">
        {selectedParticipants.map((u, i, arr) => (
          <span key={u.conferenceRecordUserId} className="text-[12px] font-bold text-[#999999] dark:text-[#64748B] tracking-tighter flex items-center">
            {u.name.toUpperCase()} {i < arr.length - 1 && <span className="mx-2 opacity-50">•</span>}
          </span>
        ))}
      </div>
      <div className="flex mt-16 gap-10">
        <button
          onClick={() => setIsPaused(!isPaused)}
          className="text-[12px] font-black uppercase tracking-widest hover:opacity-60 transition-opacity"
        >
          {isPaused ? ADDON_UI_TEXT.RESUME : ADDON_UI_TEXT.PAUSE}
        </button>
        <button
          onClick={reset}
          className="text-[12px] font-black uppercase tracking-widest text-red-600 dark:text-red-400 hover:opacity-60 transition-opacity"
        >
          {ADDON_UI_TEXT.FINISH}
        </button>
      </div>
    </div>
  );
}
