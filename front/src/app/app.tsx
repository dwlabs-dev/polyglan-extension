import { useEffect } from 'react';
import { getMeetSession } from '../lib/meet';
import ModeSelector from '../features/addon/components/ModeSelector';
import { useAuth } from '../hooks/useAuth';
import { ADDON_UI_TEXT } from '../features/addon/constants';

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
      <div className="flex flex-col items-center justify-center h-screen bg-[#FCFCF4] text-black">
        <div className="w-8 h-8 rounded-full border-[3px] border-[#999999] border-t-transparent animate-spin mb-4" />
        <span className="text-xs font-bold uppercase tracking-widest text-[#999999]">{ADDON_UI_TEXT.LOADING}</span>
      </div>
    );
  }

  if (error || !isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-[#FCFCF4] text-red-600 px-8 text-center">
        <span className="text-sm font-bold uppercase tracking-widest mb-2 border border-red-600 px-4 py-1 rounded-full">{ADDON_UI_TEXT.ERROR_AUTH_TITLE}</span>
        <p className="text-xs font-medium">{error || ADDON_UI_TEXT.ERROR_AUTH_DEFAULT}</p>
        <p className="text-[10px] text-[#999999] mt-4 uppercase">{ADDON_UI_TEXT.ERROR_AUTH_ACTION}</p>
      </div>
    );
  }

  return (
    <div className="app-container">
      <main className="flex-grow flex flex-col overflow-hidden">
        <ModeSelector />
      </main>
    </div>
  );
}

export default App;
