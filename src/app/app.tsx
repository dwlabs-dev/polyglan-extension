import { useState, useEffect } from 'react';
import { meet } from '@googleworkspace/meet-addons';
import '../features/addon/assets/addon.css'; // Updated path

interface CoActivityState {
  debateStarted: boolean;
  meetingId: string | null;
}

function App() {
  const [status, setStatus] = useState('');
  const [isDebateActive, setIsDebateActive] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);

  useEffect(() => {
    console.log('[Polyglan] App loaded - Route:', window.location.href);
  }, []);

  useEffect(() => {
    const startCoActivityListener = async () => {
      try {
        const session = await (meet.addon as any).createAddonSession({
          cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER || '1082613234514',
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
        console.warn('[Add-on] Co-activity not available (running outside Meet?)');
        setStatus('Rodando fora do Meet');
      }
    };

    startCoActivityListener();
  }, []);

  /**
   * Sends transcription to our backend for analysis
   */
  const handleTranscription = async (text: string) => {
    setStatus('Analisando debate...');
    try {
      const response = await fetch('/api/debate/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();
      if (data.insight) {
        setAnalysis(data.insight);
        setStatus('Análise concluída!');
      }
    } catch (error) {
      console.error('[Add-on] Error analyzing transcription:', error);
      setStatus('Erro na análise.');
    }
  };

  const handleStartDebate = async () => {
    setStatus('Iniciando sincronização...');
    try {
      // 1. Notificar o backend VIA PROXY (Internal way)
      await fetch('/api/session/start-debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: "ABC_" + Date.now() }),
      });

      // 2. Sincronizar via SDK para todos os participantes
      const session = await (meet.addon as any).createAddonSession({
        cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER || '1082613234514',
      });
      const client = await session.createCoActivityClient({});

      await client.setCoActivityState({
        debateStarted: true,
        meetingId: "SESSION_" + Date.now()
      });

      setStatus('Debate iniciado!');
      setIsDebateActive(true);

      // Simulação: Enviar uma transcrição após iniciar
      setTimeout(() => {
        handleTranscription("Olá, este é um teste de debate sobre a arquitetura do Polyglan.");
      }, 2000);

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
          <div className="status-badge">
            <span className={`dot ${isDebateActive ? 'active' : ''}`}></span>
            {isDebateActive ? 'Debate em Curso' : 'Aguardando Início'}
          </div>

          <p className="description">
            {isDebateActive
              ? 'Transcrição e análise em tempo real ativadas.'
              : 'Inicie uma atividade sincronizada para todos na reunião.'}
          </p>

          {!isDebateActive && (
            <button
              className="debate-button active"
              onClick={handleStartDebate}
            >
              Iniciar Debate
            </button>
          )}

          {status && <div className="status-message">{status}</div>}

          {analysis && (
            <div className="analysis-box">
              <h3>Insight da IA:</h3>
              <p>{analysis}</p>
            </div>
          )}
        </main>

        <footer>
          <span>v1.1.0 (Fullstack UI)</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
