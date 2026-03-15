import { useState, useEffect } from 'react';
import { meet } from '@googleworkspace/meet-addons';
import type { MeetAddonClient } from '@googleworkspace/meet-addons';
import './App.css';

function App() {
  const [role, setRole] = useState<'student' | 'teacher' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [meetClient, setMeetClient] = useState<MeetAddonClient | null>(null);
  const [isInMeet, setIsInMeet] = useState(false);

  console.log('meetClient state:', !!meetClient);

  useEffect(() => {
    async function initMeet() {
      try {
        // O SDK do Meet é acessado via meet.addon
        // É necessário um Cloud Project Number real para produção, 
        // mas para detecção inicial tentamos criar a sessão.
        const session = await meet.addon.createAddonSession({
          cloudProjectNumber: 'REPLACE_WITH_YOUR_PROJECT_NUMBER'
        });

        // No Side Panel, criamos o client específico
        const client = await session.createSidePanelClient();
        setMeetClient(client);
        setIsInMeet(true);
        console.log('Polyglan: Conectado ao Google Meet Add-on SDK');
      } catch (e) {
        console.log('Polyglan: Rodando fora do Google Meet ou erro no SDK', e);
        setIsInMeet(false);
      }
    }
    initMeet();
  }, []);

  if (!role) {
    return (
      <div className="container">
        <div className="env-badge">
          {isInMeet ? '✅ Conectado ao Meet' : '🌐 Modo Preview'}
        </div>
        <h1 className="logo-text">Polyglan</h1>
        <p className="subtitle">Selecione seu perfil na chamada:</p>
        <div className="role-buttons">
          <button className="btn-primary" onClick={() => setRole('teacher')}>
            Painel do Professor
          </button>
          <button className="btn-secondary" onClick={() => setRole('student')}>
            Painel do Aluno
          </button>
        </div>
      </div>
    );
  }

  if (role === 'teacher') {
    return (
      <div className="container teacher-mode">
        <h2 className="title">Painel do Professor</h2>
        <div className="card">
          <label className="label">Configurar Tipo de Aula:</label>
          <select className="input-select">
            <option>Selecione...</option>
            <option>Debate Interativo</option>
            <option>Contação de História (Storytelling)</option>
            <option>Revisão de Gramática</option>
          </select>
          <p className="helper-text">Isso ajustará como a IA avalia os alunos.</p>
        </div>

        {isInMeet && (
          <div className="meeting-info">
            💻 Sessão Ativa detectada.
          </div>
        )}

        <button className="btn-text" onClick={() => setRole(null)}>
          &larr; Voltar
        </button>
      </div>
    );
  }

  // Student Mode
  return (
    <div className="container student-mode">
      <h2 className="title">Painel do Aluno</h2>

      <div className="status-card">
        <div className={`status-indicator ${isRecording ? 'recording' : 'idle'}`}>
          <div className="dot"></div>
          {isRecording ? 'Capturando seu áudio para a IA...' : 'Gravação pausada'}
        </div>
      </div>

      <button
        className={`btn-record ${isRecording ? 'btn-stop' : 'btn-start'}`}
        onClick={() => setIsRecording(!isRecording)}
      >
        {isRecording ? 'Parar Gravação' : 'Iniciar Gravação'}
      </button>

      <p className="helper-text center">Apenas o seu áudio será capturado para avaliação de pronúncia e vocabulário.</p>

      {isInMeet && (
        <div className="meeting-info success mt-4">
          ✨ Integração Meet ativa. Suas falas serão enviadas para análise.
        </div>
      )}

      <button className="btn-text mt-auto" onClick={() => setRole(null)}>
        &larr; Voltar
      </button>
    </div>
  );
}

export default App;
