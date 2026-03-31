import { socketService } from '../../../services/socket.service';
import { ADDON_UI_TEXT } from '../../addon/constants';

interface SessionControlsProps {
  sessionId: string;
  isPaused: boolean;
  activeMode: string | null;
  onPauseToggle: () => void;
  onFinish: () => void;
  onStartMode: (mode: 'debate' | 'history') => void;
}

export function SessionControls({
  isPaused,
  activeMode,
  onPauseToggle,
  onFinish,
  onStartMode
}: Omit<SessionControlsProps, 'sessionId'>) {
  
  const handleStartMode = (mode: 'debate' | 'history') => {
    socketService.send('START_MODE', { mode: mode.toUpperCase() });
    onStartMode(mode);
  };

  const handlePauseToggle = () => {
    if (isPaused) {
      socketService.send('START_MODE', { mode: activeMode?.toUpperCase() || 'DEBATE' });
    } else {
      socketService.send('PAUSE_MODE', {});
    }
    onPauseToggle();
  };

  const handleFinish = () => {
    socketService.send('STOP_MODE', {});
    onFinish();
  };

  if (activeMode) {
    return (
      <div className="flex mt-16 gap-10">
        <button
          onClick={handlePauseToggle}
          className="text-[12px] font-display font-black uppercase tracking-widest hover:opacity-60 transition-opacity cursor-pointer text-polyglan-brown dark:text-polyglan-cream"
        >
          {isPaused ? ADDON_UI_TEXT.RESUME : ADDON_UI_TEXT.PAUSE}
        </button>
        <button
          onClick={handleFinish}
          className="text-[12px] font-display font-black uppercase tracking-widest text-polyglan-secondary dark:text-polyglan-secondary hover:opacity-60 transition-opacity cursor-pointer"
        >
          {ADDON_UI_TEXT.FINISH}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 w-full max-w-[500px] mx-auto mt-6">
      <button
        onClick={() => handleStartMode('history')}
        className="w-full py-4 rounded-full bg-polyglan-primary text-polyglan-brown-dark font-display font-bold text-[11px] uppercase tracking-[0.15em] transition-transform hover:bg-polyglan-primary/90 active:scale-[0.98]"
      >
        {ADDON_UI_TEXT.START_HISTORY}
      </button>

      <button
        onClick={() => handleStartMode('debate')}
        className="w-full py-4 rounded-full bg-white text-polyglan-brown border-2 border-polyglan-brown dark:bg-polyglan-brown dark:text-polyglan-cream dark:border-polyglan-beige font-display font-bold text-[11px] uppercase tracking-[0.15em] transition-transform hover:bg-polyglan-beige/10 active:scale-[0.98]"
      >
        {ADDON_UI_TEXT.MODE_DEBATE}
      </button>
    </div>
  );
}
