import React from 'react';
import { useSession } from './hooks/useSession';

const App: React.FC = () => {
  const { state, login, logout, isLoading } = useSession();

  if (isLoading) {
    return (
      <div style={styles.container}>
        <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
        <p style={{ marginTop: '20px' }}>Carregando...</p>
      </div>
    );
  }

  if (!state) return null;

  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <div style={styles.content}>
            <div style={styles.logoContainer}>
              <div style={styles.logoIcon}>P</div>
              <h1 style={styles.title}>POLYGLAN</h1>
            </div>
            <p style={styles.subtitle}>Aprenda sem fronteiras. Conecte sua conta para iniciar.</p>
            <button style={styles.primaryButton} onClick={login}>
              Entrar com Google
            </button>
          </div>
        );

      case 'waiting':
        return (
          <div style={styles.content}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>⏳</div>
            <h2 style={styles.title}>Tudo pronto</h2>
            <p style={styles.subtitle}>O professor está preparando o ambiente. Aguarde um instante.</p>
            <div style={styles.userBadge}>
              LOGADO COMO <strong>{state.userName || state.googleEmail?.split('@')[0]}</strong>
            </div>
            <button style={styles.secondaryButton} onClick={logout}>
              Encerrar Sessão
            </button>
          </div>
        );

      case 'recording':
        return (
          <div style={styles.content}>
             {state.mode === 'HISTORIA' && (
               <div style={styles.historyBanner}>
                 <div className="recording-dot"></div>
                 <span>HISTÓRIA ATIVA</span>
               </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '20px' }}>
                  {state.mode === 'HISTORIA' ? 'SUA NARRATIVA' : 'Sessão Ativa'}
                </h2>
                <span style={styles.liveBadge}>LIVE</span>
             </div>

             <div style={styles.transcriptBox}>
                {state.interimTranscript ? (
                  <p style={styles.transcriptText}>{state.interimTranscript}</p>
                ) : (
                  <p style={styles.placeholderText}>Ouvindo áudio...</p>
                )}
             </div>

             <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="recording-dot"></div>
                  <span style={{ fontSize: '12px', fontWeight: 'bold' }}>MICROFONE ATIVO</span>
                </div>
             </div>
          </div>
        );

      case 'paused':
        return (
          <div style={styles.content}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>⏸️</div>
            <h2 style={styles.title}>Sessão Pausada</h2>
            <p style={styles.subtitle}>O professor pausou a atividade momentaneamente.</p>
          </div>
        );

      case 'ended':
        return (
          <div style={styles.content}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎓</div>
            <h2 style={styles.title}>Sessão Finalizada</h2>
            <p style={styles.subtitle}>Excelente participação! Seus dados foram salvos.</p>
            <button style={styles.primaryButton} onClick={() => window.location.reload()}>
              Voltar ao Início
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={styles.container}>
      <style>{styles.css}</style>
      {renderContent()}
    </div>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '450px',
    padding: '24px',
    color: '#FDFBF7',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    backgroundColor: '#F4A900',
    color: '#2C2420',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
  },
  title: {
    fontSize: '24px',
    fontWeight: '800',
    margin: '0 0 12px 0',
    color: '#F4A900',
  },
  subtitle: {
    fontSize: '14px',
    textAlign: 'center',
    color: '#A09088',
    marginBottom: '32px',
    lineHeight: '1.5',
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#F4A900',
    color: '#2C2420',
    border: 'none',
    borderRadius: '9999px',
    fontWeight: '700',
    fontSize: '16px',
    boxShadow: '0 4px 14px rgba(244, 169, 0, 0.3)',
  },
  secondaryButton: {
    width: '100%',
    padding: '12px',
    backgroundColor: 'transparent',
    color: '#A09088',
    border: '1px solid #A09088',
    borderRadius: '9999px',
    fontWeight: '600',
    marginTop: '10px',
  },
  userBadge: {
    backgroundColor: 'rgba(244, 169, 0, 0.1)',
    padding: '12px 20px',
    borderRadius: '12px',
    color: '#F4A900',
    fontSize: '13px',
    marginBottom: '24px',
    border: '1px solid rgba(244, 169, 0, 0.3)',
  },
  historyBanner: {
    width: '100%',
    backgroundColor: '#F4A900',
    color: '#2C2420',
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '12px',
    fontWeight: '900',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '16px',
  },
  transcriptBox: {
    width: '100%',
    minHeight: '150px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '16px',
    padding: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  transcriptText: {
    fontSize: '16px',
    fontStyle: 'italic',
    textAlign: 'center',
    margin: 0,
  },
  placeholderText: {
    color: '#A09088',
    fontSize: '14px',
  },
  liveBadge: {
    backgroundColor: '#C1666B',
    color: 'white',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: '900',
  },
  css: `
    .recording-dot {
      width: 8px;
      height: 8px;
      background-color: #C1666B;
      border-radius: 50%;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { transform: scale(1); opacity: 1; }
      70% { transform: scale(1.5); opacity: 0; }
      100% { transform: scale(1.5); opacity: 0; }
    }
    .lds-ring {
      display: inline-block;
      position: relative;
      width: 64px;
      height: 64px;
    }
    .lds-ring div {
      box-sizing: border-box;
      display: block;
      position: absolute;
      width: 51px;
      height: 51px;
      margin: 6px;
      border: 6px solid #F4A900;
      border-radius: 50%;
      animation: lds-ring 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
      border-color: #F4A900 transparent transparent transparent;
    }
    .lds-ring div:nth-child(1) { animation-delay: -0.45s; }
    .lds-ring div:nth-child(2) { animation-delay: -0.3s; }
    .lds-ring div:nth-child(3) { animation-delay: -0.15s; }
    @keyframes lds-ring {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `
} as any;

export default App;
