import '../assets/addon.css';
import { useState, useEffect } from 'react';
import { meet } from '@googleworkspace/meet-addons';

interface CoActivityState {
  debateStarted: boolean;
  meetingId: string | null;
}

function App() {
  const [status, setStatus] = useState('');
  const [isDebateActive, setIsDebateActive] = useState(false);

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
              setIsDebateActive(true);
              setStatus(`Modo Debate ATIVO`);
            } else {
              setIsDebateActive(false);
              setStatus('Pronto para iniciar');
            }
          },
        });
      } catch (e) {
        console.warn('[Add-on] Co-activity não disponível (fora do Meet?)');
      }
    };

    startCoActivityListener();
  }, []);

  const handleStartDebate = async () => {

    setStatus('Iniciando sincronização...');

    try {
      // 1. Notificar o backend (opcional, para logs/persistência)
      await fetch('/api/session/start-debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: "ABC" }),
      });

      // 2. Sincronizar via SDK para todos os participantes
      // Assume que meet.addon já foi inicializado em main.tsx
      const client = await (meet.addon as any).createCoActivityClient({});

      await client.setCoActivityState({
        debateStarted: true,
        meetingId: "ABC"
      });

      setStatus('Sincronização enviada para todos!');
      setIsDebateActive(true);

    } catch (error) {
      console.error('Co-activity error:', error);
      setStatus('Erro ao sincronizar debate.');
    }
  };

  return (
    <div className="app-container side-panel">
      <div className="glass-panel">
        <header>
          <img src="/logo.png" alt="Polyglan Logo" className="logo" />
          <h1>Polyglan</h1>
        </header>

        <main>
          <p className="description">
            {isDebateActive
              ? 'O modo debate está ativo para todos os participantes.'
              : 'Inicie uma atividade sincronizada para todos na reunião.'}
          </p>

          <button
            className={`debate-button active`}
            onClick={handleStartDebate}
          >
            {'Iniciar Debate'}
          </button>

          {status && <div className="status-message">{status}</div>}
        </main>

        <footer>
          <span>v1.0.0 (Meet SDK)</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
