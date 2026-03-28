import { ADDON_UI_TEXT } from '../constants';
import type { Participant } from '../../../types';
import type { Mode } from '../../../types';

interface ParticipantSelectionPageProps {
  participants: Participant[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  toggleParticipant: (id: string) => void;
  startMode: (mode: Mode) => void;
}

export default function ParticipantSelectionPage({
  participants,
  loading,
  error,
  selectedIds,
  toggleParticipant,
  startMode
}: ParticipantSelectionPageProps) {
  return (
    <div className="flex flex-col flex-grow bg-[#FCFCF4] text-black dark:bg-[#0F172A] dark:text-[#F8FAFC]">
      {/* HEADER */}
      <header className="p-6 pt-8 pb-4">
        <h1 className="text-[20px] font-black tracking-tighter uppercase mb-6">
          {ADDON_UI_TEXT.BRAND}
        </h1>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#999999] dark:text-[#64748B] mb-4">
          {ADDON_UI_TEXT.PARTICIPANTS_ACTIVE}
        </h2>
      </header>

      {/* LIST */}
      <div className="flex-grow overflow-y-auto px-6 pb-6 w-full max-w-[500px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-[#999999] dark:text-[#64748B] opacity-70">
            <div className="w-8 h-8 rounded-full border-[3px] border-current border-t-transparent animate-spin mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest">{ADDON_UI_TEXT.LOADING}</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-red-500 font-bold text-sm">
             {error}
          </div>
        ) : participants.length === 0 ? (
          <div className="mt-12 text-center opacity-30 text-xs italic tracking-tight">
            {ADDON_UI_TEXT.NO_PARTICIPANTS}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {participants.map((user) => {
              const isSelected = selectedIds.includes(user.conferenceRecordUserId);
              return (
                <div
                  key={user.conferenceRecordUserId}
                  onClick={() => toggleParticipant(user.conferenceRecordUserId)}
                  className={`flex items-center p-3 min-h-[60px] rounded-2xl cursor-pointer transition-all border w-full
                    ${isSelected
                      ? 'bg-white border-black shadow-sm ring-1 ring-black dark:bg-[#1E293B] dark:border-[#38BDF8] dark:ring-[#38BDF8]'
                      : 'bg-[#F4F4EC] border-transparent hover:bg-white dark:bg-[#1E293B]/50 dark:border-transparent dark:hover:bg-[#1E293B]'
                    }`}
                >
                  <div className="w-9 h-9 shrink-0 rounded-full bg-black text-[#FCFCF4] dark:bg-[#0F172A] dark:border dark:border-[#334155] dark:text-white flex items-center justify-center text-xs font-bold mr-4">
                    {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : '?'}
                  </div>
                  <span className="text-[14px] font-bold flex-grow tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.name}
                  </span>
                  <div className={`w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isSelected ? 'border-black bg-black dark:border-[#38BDF8] dark:bg-[#38BDF8]' : 'border-[#999999] dark:border-[#475569]'}`}>
                    {isSelected && (
                      <div className="w-[8px] h-[8px] rounded-full bg-[#FCFCF4] dark:bg-[#0F172A]"></div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FOOTER */}
      {selectedIds.length > 0 && !loading && !error && (
        <footer className="p-6 bg-[#FCFCF4] dark:bg-[#0F172A] border-t border-[#F0EEE6] dark:border-[#334155]">
          <div className="flex flex-col gap-3 w-full max-w-[500px] mx-auto">
            <button
              onClick={() => startMode('history')}
              className="w-full py-4 rounded-full bg-black text-white dark:bg-white dark:text-black font-bold text-[11px] uppercase tracking-[0.15em] transition-transform active:scale-[0.98]"
            >
              {ADDON_UI_TEXT.START_HISTORY}
            </button>

            {selectedIds.length >= 2 && (
              <button
                onClick={() => startMode('debate')}
                className="w-full py-4 rounded-full bg-white text-black border-2 border-black dark:bg-[#0F172A] dark:text-white dark:border-white font-bold text-[11px] uppercase tracking-[0.15em] transition-transform active:scale-[0.98]"
              >
                {ADDON_UI_TEXT.MODE_DEBATE}
              </button>
            )}
          </div>
          <div className="text-[9px] text-center uppercase tracking-widest text-[#999999] dark:text-[#64748B] mt-4 font-bold flex flex-col gap-1">
            <span>{selectedIds.length} {ADDON_UI_TEXT.SELECTED_COUNT_SUFFIX}</span>
            {selectedIds.length < 2 && (
              <span className="opacity-50">{ADDON_UI_TEXT.DEBATE_MIN_WARNING}</span>
            )}
          </div>
        </footer>
      )}
    </div>
  );
}
