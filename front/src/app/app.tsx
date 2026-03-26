import { useState, useEffect } from 'react';
import { meet } from '@googleworkspace/meet-addons';
import ModeSelector from '../features/addon/components/ModeSelector';
import ParticipantSelector from '../features/addon/components/ParticipantSelector';
import { startSession } from '../services/session.service';
import type { Mode } from '../types';

type View = 'mode-select' | 'participant-select' | 'active';

interface CoActivityState {
  debateStarted: boolean;
  meetingId: string | null;
}

function App() {
  const [view, setView] = useState<View>('mode-select');
  const [selectedMode, setSelectedMode] = useState<Mode | null>(null);
  const [status, setStatus] = useState('');
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Polyglan] App loaded');
    
    const startCoActivityListener = async () => {
      try {
        const session = await (meet.addon as any).createAddonSession({
          cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER,
        });

        await session.createCoActivityClient({
          onCoActivityStateChanged: (state: CoActivityState) => {
            console.log('[Add-on] Co-activity state changed:', state);
            if (state.debateStarted) {
              setIsSessionActive(true);
              setStatus('Sessão ATIVA');
            } else {
              setIsSessionActive(false);
              setStatus('Pronto para iniciar');
            }
          },
        });
      } catch {
        console.warn('[Add-on] Co-activity not available (running outside Meet?)');
      }
    };

    startCoActivityListener();
  }, []);

  const handleSelectMode = (mode: Mode) => {
    setSelectedMode(mode);
    setView('participant-select');
  };

  const handleBack = () => {
    setView('mode-select');
    setSelectedMode(null);
  };

  const handleStartSession = async (mode: Mode, participantIds: string[]) => {
    setStatus('Iniciando sessão...');

    try {
      const data = await startSession(mode, participantIds);

      if (data.status === 'error') {
        setStatus(data.message || 'Erro ao iniciar sessão.');
        return;
      }

      const modeLabel = mode === 'debate' ? 'Debate' : 'History';

      try {
        const session = await (meet.addon as any).createAddonSession({
          cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER,
        });
        const client = await session.createCoActivityClient({});
        await client.setCoActivityState({
          debateStarted: true,
          meetingId: `${modeLabel}_${Date.now()}`,
        });
      } catch {
        console.warn('[Add-on] Meet SDK sync skipped (outside Meet).');
      }

      setIsSessionActive(true);
      setView('active');
      setStatus(`${modeLabel} iniciado!`);
    } catch (error) {
      console.error('Session start error:', error);
      setStatus('Erro ao iniciar sessão.');
    }
  };

  const handleEndSession = () => {
    setIsSessionActive(false);
    setAnalysis(null);
    setStatus('');
    setSelectedMode(null);
    setView('mode-select');
  };

  return (
    <div className="app-container">
      <main className="flex-grow flex flex-col overflow-hidden">
        {/* View: Mode Selection (Matches mockup) */}
        {view === 'mode-select' && (
          <ModeSelector />
        )}

        {/* View: Participant Selection (Legacy, will be replaced by ModeSelector logic) */}
        {view === 'participant-select' && selectedMode && (
          <ParticipantSelector
            mode={selectedMode}
            onStart={handleStartSession}
            onBack={handleBack}
          />
        )}

        {/* View: Active Session */}
        {view === 'active' && (
          <div className="flex flex-col items-center justify-center p-8 bg-[#FCFCF4] h-full overflow-hidden">
             {/* Note: In active mode, ModeSelector also handles its own timer UI if we want it to. 
                 But here we use the App's active view for now. */}
             <div className="flex flex-col items-center gap-4">
                <div className="text-[12px] font-bold uppercase tracking-widest border border-black px-4 py-1 rounded-full">
                  Sessão em Curso
                </div>
                <div className="text-[64px] font-light tracking-tighter tabular-nums">
                  {status.includes('iniciado') ? 'ATIVO' : status}
                </div>
                <button
                  className="mt-12 text-[12px] font-bold uppercase tracking-widest text-red-600 hover:opacity-60"
                  onClick={handleEndSession}
                >
                  Encerrar Sessão
                </button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
