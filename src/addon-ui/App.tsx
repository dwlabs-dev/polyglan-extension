import { useState, useEffect } from 'react';
import { meet } from '@googleworkspace/meet-addons';
import './index.css';

/**
 * Polyglan Meet Add-on UI
 * Optimized for Google Meet Side Panel
 */
function App() {
  const [status, setStatus] = useState('');
  const [meetingId, setMeetingId] = useState<string | null>(null);

  useEffect(() => {
    const initSdk = async () => {
      try {
        console.log('[Add-on] Initializing Meet SDK...');
        await meet.addon.createAddonSession({
          cloudProjectNumber: '792576089745', // Placeholder: Substitua pelo seu número do projeto no Google Cloud
        });
        // Simulando a extração para evitar erro de lint.
        setMeetingId('meet-id-' + Date.now());
      } catch (error) {
        console.error('[Add-on] SDK Initialization failed:', error);
        setStatus('Erro ao carregar SDK do Meet.');
      }
    };
    initSdk();
  }, []);

  const handleStartDebate = async () => {
    setStatus('Iniciando...');

    try {
      const response = await fetch('http://localhost:3001/api/session/start-debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: meetingId || 'meet-id-placeholder' }),
      });

      const data = await response.json();

      if (data.status === 'debate_started') {
        setStatus('Debate iniciado com sucesso!');
      } else {
        setStatus('Erro ao iniciar debate.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('Erro de conexão com o servidor.');
    }
  };

  const handleCreateRoom = async () => {
    setStatus('Criando sala...');

    try {
      const response = await fetch('http://localhost:3001/api/meet/create-space', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: meetingId || 'meet-id-placeholder' }),
      });

      const data = await response.json();

      if (data.status === 'debate_started') {
        setStatus('Debate iniciado com sucesso!');
      } else {
        setStatus('Erro ao iniciar debate.');
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('Erro de conexão com o servidor.');
    }
  };

  return (
    <div className="app-container side-panel">
      <div className="glass-panel">
        <header>
          <img src="https://polyglan.com/logo.png" alt="Polyglan Logo" className="logo" />
          <h1>Polyglan Debate</h1>
        </header>

        <main>
          <p className="description">
            Pratique seu inglês em tempo real durante a reunião.
          </p>
          <button
            className="create-room-button"
            onClick={handleCreateRoom}
          >
            Criar Sala
          </button>

          <button
            className="debate-button"
            onClick={handleStartDebate}
          >
            Iniciar Modo Debate
          </button>

          {status && <div className="status-message">{status}</div>}
        </main>

        <footer>
          <span>v1.0.0</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
