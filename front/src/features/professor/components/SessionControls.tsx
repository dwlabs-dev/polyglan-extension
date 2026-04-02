import { socketService } from '../../../services/socket.service';
import { ADDON_UI_TEXT } from '../constants';

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
      <div className="flex flex-col items-center mt-12 gap-6 w-full animate-fade-in-up stagger-3">
        <div className="flex gap-4 w-full">
          <button
            onClick={handlePauseToggle}
            className="btn-secondary flex-1 shadow-sm"
          >
            {isPaused ? ADDON_UI_TEXT.RESUME : ADDON_UI_TEXT.PAUSE}
          </button>
          
          <button
            onClick={handleFinish}
            className="btn-terracotta flex-1 shadow-lg shadow-polyglan-secondary/20"
          >
            {ADDON_UI_TEXT.FINISH}
          </button>
        </div>
        
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-polyglan-muted opacity-60">
          Sessão em Tempo Real
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-[500px] mx-auto mt-8 animate-fade-in-up stagger-2">
      <button
        onClick={() => handleStartMode('history')}
        className="btn-primary w-full shadow-lg shadow-polyglan-primary/20"
      >
        {ADDON_UI_TEXT.START_HISTORY}
      </button>

      <button
        onClick={() => handleStartMode('debate')}
        className="btn-secondary w-full"
      >
        {ADDON_UI_TEXT.MODE_DEBATE}
      </button>
    </div>
  );
}

