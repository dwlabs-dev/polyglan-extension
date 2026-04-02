import { useEffect } from 'react';
import { getMeetSession } from '../lib/meet';
import ModeSelector from '../features/professor/components/ModeSelector';
import { useAuth } from '../hooks/useAuth';
import { ADDON_UI_TEXT } from '../features/professor/constants';

interface CoActivityState {
  debateStarted: boolean;
  meetingId: string | null;
}

function App() {
  const { isAuthenticated, loading, error } = useAuth();

  useEffect(() => {
    console.log('[Polyglan] App loaded');

    const startCoActivityListener = async () => {
      try {
        const session = await getMeetSession();

        await session.createCoActivityClient({
          onCoActivityStateChanged: (state: CoActivityState) => {
            console.log('[Add-on] Co-activity state changed:', state);
            if (state.debateStarted) {
              console.log('Session is now ACTIVE in Meet SDK');
            } else {
              console.log('Session is now READY in Meet SDK');
            }
          },
        });
      } catch {
        console.warn('[Add-on] Co-activity not available (running outside Meet?)');
      }
    };

    startCoActivityListener();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-polyglan-cream text-polyglan-brown font-sans">
        <div className="relative mb-6">
          <div className="w-12 h-12 rounded-2xl border-[3px] border-polyglan-primary/20 border-t-polyglan-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-polyglan-primary rounded-full animate-pulse" />
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-polyglan-muted animate-pulse">
          {ADDON_UI_TEXT.LOADING}
        </span>
      </div>
    );
  }

  if (error || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-polyglan-cream text-polyglan-secondary px-8 text-center animate-fade-in-up">
        <div className="w-16 h-16 bg-polyglan-secondary/10 rounded-3xl flex items-center justify-center mb-6 border border-polyglan-secondary/20">
          <svg className="w-8 h-8 text-polyglan-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H10m10.5-9a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="text-sm font-display font-black uppercase tracking-widest mb-2 text-polyglan-brown">
          {ADDON_UI_TEXT.ERROR_AUTH_TITLE}
        </h1>
        <p className="text-xs font-medium text-polyglan-muted max-w-[200px] leading-relaxed">
          {error || ADDON_UI_TEXT.ERROR_AUTH_DEFAULT}
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-2 bg-polyglan-brown text-polyglan-cream rounded-full text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all"
        >
          {ADDON_UI_TEXT.ERROR_AUTH_ACTION || 'Recarregar'}
        </button>
      </div>
    );
  }

  return (
    <div className="app-container bg-polyglan-cream select-none">
      <main className="flex-grow flex flex-col overflow-hidden animate-fade-in-up">
        <ModeSelector />
      </main>
    </div>
  );
}

export default App;

