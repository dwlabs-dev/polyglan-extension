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
    console.log('[Polyglan] App loaded - Route:', window.location.href);
  }, []);

  useEffect(() => {
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

      // Try to sync via Meet SDK
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
      setStatus(`${modeLabel} iniciado com ${participantIds.length} participante(s)!`);
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
    <div className="app-container side-panel">
      <div className="glass-panel">
        <header>
          <img src="/logo.png" alt="Polyglan Logo" className="logo" />
          <h1>Polyglan</h1>
        </header>

        <main>
          {/* View: Mode Selection */}
          {view === 'mode-select' && (
            <ModeSelector onSelectMode={handleSelectMode} />
          )}

          {/* View: Participant Selection */}
          {view === 'participant-select' && selectedMode && (
            <ParticipantSelector
              mode={selectedMode}
              onStart={handleStartSession}
              onBack={handleBack}
            />
          )}

          {/* View: Active Session */}
          {view === 'active' && (
            <div className="active-session">
              <div className="status-badge">
                <span className={`dot ${isSessionActive ? 'active' : ''}`}></span>
                {selectedMode === 'debate' ? 'Debate em Curso' : 'History em Curso'}
              </div>

              <p className="description">
                Transcrição e análise em tempo real ativadas.
              </p>

              {status && <div className="status-message">{status}</div>}

              {analysis && (
                <div className="analysis-box">
                  <h3>Insight da IA:</h3>
                  <p>{analysis}</p>
                </div>
              )}

              <button
                className="end-session-button"
                onClick={handleEndSession}
                id="end-session-button"
              >
                Encerrar Sessão
              </button>
            </div>
          )}
        </main>

        <footer>
          <span>v2.0.0 (Mode Selection)</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
