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
    <div className="flex flex-col flex-grow bg-polyglan-cream text-polyglan-brown dark:bg-polyglan-brown-dark dark:text-polyglan-cream">
      {/* HEADER */}
      <header className="p-6 pt-8 pb-4">
        <h1 className="text-[20px] font-display font-black tracking-tighter uppercase mb-6">
          {ADDON_UI_TEXT.BRAND}
        </h1>
        <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-polyglan-muted dark:text-polyglan-beige-light mb-4">
          {ADDON_UI_TEXT.PARTICIPANTS_ACTIVE}
        </h2>
      </header>

      {/* LIST */}
      <div className="flex-grow overflow-y-auto px-6 pb-6 w-full max-w-[500px] mx-auto">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-polyglan-muted dark:text-polyglan-beige-light opacity-70">
            <div className="w-8 h-8 rounded-full border-[3px] border-current border-t-transparent animate-spin mb-4" />
            <span className="text-xs font-bold uppercase tracking-widest">{ADDON_UI_TEXT.LOADING}</span>
          </div>
        ) : error ? (
          <div className="text-center py-12 text-polyglan-secondary font-bold text-sm">
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
                  className={`flex items-center p-3 min-h-[60px] rounded-2xl cursor-pointer transition-all duration-200 border w-full
                    ${isSelected
                      ? 'bg-white border-polyglan-primary shadow-sm ring-1 ring-polyglan-primary dark:bg-polyglan-brown dark:border-polyglan-primary dark:ring-polyglan-primary'
                      : 'bg-polyglan-beige/20 border-transparent hover:bg-white dark:bg-polyglan-brown/50 dark:hover:bg-polyglan-brown'
                    }`}
                >
                  <div className="w-9 h-9 shrink-0 rounded-full bg-polyglan-brown text-polyglan-cream dark:bg-polyglan-brown-dark dark:border dark:border-polyglan-beige dark:text-polyglan-cream flex items-center justify-center text-xs font-bold mr-4">
                    {user.name && user.name.length > 0 ? user.name[0].toUpperCase() : '?'}
                  </div>
                  <span className="text-[14px] font-bold flex-grow tracking-tight overflow-hidden text-ellipsis whitespace-nowrap">
                    {user.name}
                  </span>
                  <div className={`w-[22px] h-[22px] shrink-0 rounded-full border-2 flex items-center justify-center transition-colors
                    ${isSelected ? 'border-polyglan-primary bg-polyglan-primary dark:border-polyglan-primary dark:bg-polyglan-primary' : 'border-polyglan-muted dark:border-polyglan-beige-light'}`}>
                    {isSelected && (
                      <div className="w-[8px] h-[8px] rounded-full bg-white dark:bg-polyglan-brown-dark"></div>
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
        <footer className="p-6 bg-polyglan-cream dark:bg-polyglan-brown-dark border-t border-polyglan-beige dark:border-polyglan-brown">
          <div className="flex flex-col gap-3 w-full max-w-[500px] mx-auto">
            <button
              onClick={() => startMode('history')}
              className="w-full py-4 rounded-full bg-polyglan-primary text-polyglan-brown-dark font-display font-bold text-[11px] uppercase tracking-[0.15em] transition-transform hover:bg-polyglan-primary/90 active:scale-[0.98]"
            >
              {ADDON_UI_TEXT.START_HISTORY}
            </button>

            {selectedIds.length >= 2 && (
              <button
                onClick={() => startMode('debate')}
                className="w-full py-4 rounded-full bg-white text-polyglan-brown border-2 border-polyglan-brown dark:bg-polyglan-brown dark:text-polyglan-cream dark:border-polyglan-beige font-display font-bold text-[11px] uppercase tracking-[0.15em] transition-transform hover:bg-polyglan-beige/10 active:scale-[0.98]"
              >
                {ADDON_UI_TEXT.MODE_DEBATE}
              </button>
            )}
          </div>
          <div className="text-[9px] text-center uppercase tracking-widest text-polyglan-muted dark:text-polyglan-beige-light mt-4 font-bold flex flex-col gap-1">
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
