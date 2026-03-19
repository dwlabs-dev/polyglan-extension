import { useState, useEffect } from 'react';
import { meet } from '@googleworkspace/meet-addons';
import './index.css';

interface MeetingData {
  meetingUri: string;
  meetingCode: string;
  name: string;
}

interface CoActivityState {
  debateStarted: boolean;
  meetingId: string | null;
}

function App() {
  const [status, setStatus] = useState('');
  const [meetingData, setMeetingData] = useState<MeetingData | null>(null);
  const [isDebateActive, setIsDebateActive] = useState(false);

  useEffect(() => {
    // A inicialização principal agora ocorre no main.tsx para handshake imediato.
    // Aqui podemos apenas escutar o estado da co-activity se necessário.
    const startCoActivityListener = async () => {
      try {
        const session = await (meet.addon as any).createAddonSession({
          cloudProjectNumber: '792576089745', 
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

  const handleCreateRoom = async () => {
    setStatus('Criando sala...');
    setMeetingData(null);

    try {
      const response = await fetch('http://localhost:3001/api/meet/create-space', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.status === 'success') {
        const newMeeting = {
          meetingUri: data.meetingUri,
          meetingCode: data.meetingCode,
          name: data.meetingName
        };
        setMeetingData(newMeeting);
        setStatus('Sala criada com sucesso!');
      } else {
        setStatus('Erro ao criar sala: ' + (data.error || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setStatus('Erro de conexão com o servidor.');
    }
  };

  const handleStartDebate = async () => {
    if (!meetingData) {
      setStatus('Crie uma sala primeiro.');
      return;
    }

    setStatus('Iniciando sincronização...');

    try {
      // 1. Notificar o backend (opcional, para logs/persistência)
      await fetch('http://localhost:3001/api/session/start-debate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ meetingId: meetingData.meetingCode }),
      });

      // 2. Sincronizar via SDK para todos os participantes
      // Assume que meet.addon já foi inicializado em main.tsx
      const client = await (meet.addon as any).createCoActivityClient({});
      
      await client.setCoActivityState({
        debateStarted: true,
        meetingId: meetingData.meetingCode
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
          <img src="https://polyglan.com/logo.png" alt="Polyglan Logo" className="logo" />
          <h1>Polyglan Debate</h1>
        </header>

        <main>
          <p className="description">
            {isDebateActive 
              ? 'O modo debate está ativo para todos os participantes.' 
              : 'Inicie uma atividade sincronizada para todos na reunião.'}
          </p>
          
          {!isDebateActive && (
            <button
              className="create-room-button"
              onClick={handleCreateRoom}
              disabled={status === 'Criando sala...'}
            >
              {meetingData ? 'Sala Gerada' : 'Gerar Sala de Debate'}
            </button>
          )}

          {meetingData && !isDebateActive && (
            <div className="meeting-info">
              <p>ID: <strong>{meetingData.meetingCode}</strong></p>
            </div>
          )}

          <button
            className={`debate-button ${isDebateActive ? 'active' : ''}`}
            onClick={handleStartDebate}
            disabled={!meetingData || isDebateActive}
          >
            {isDebateActive ? 'Debate em Curso...' : 'Sincronizar Debate (All)'}
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
