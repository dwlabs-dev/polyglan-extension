import React from 'react';
import { useSession } from './hooks/useSession';

const App: React.FC = () => {
  const { state, login, logout, isLoading } = useSession();

  if (isLoading) {
    return (
      <div className="flex-center flex-column" style={{ minHeight: '450px' }}>
        <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
        <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Carregando...
        </p>
      </div>
    );
  }

  if (!state) return null;

  const renderContent = () => {
    switch (state.status) {
      case 'idle':
        return (
          <div className="flex-center flex-column animate-fade-in-up" style={styles.content}>
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
          <div className="flex-center flex-column animate-fade-in-up" style={styles.content}>
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
          <div className="flex-column animate-fade-in-up" style={{ ...styles.content, alignItems: 'stretch' }}>
             {state.mode === 'HISTORIA' && (
               <div style={styles.historyBanner}>
                 <div className="recording-dot"></div>
                 <span>HISTÓRIA ATIVA</span>
               </div>
             )}
             <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
                  {state.mode === 'HISTORIA' ? 'SUA NARRATIVA' : 'Sessão Ativa'}
                </h2>
                <span className="live-badge">LIVE</span>
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
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--accent-red)' }}>MICROFONE ATIVO</span>
                </div>
             </div>
          </div>
        );

      case 'paused':
        return (
          <div className="flex-center flex-column animate-fade-in-up" style={styles.content}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>⏸️</div>
            <h2 style={styles.title}>Sessão Pausada</h2>
            <p style={styles.subtitle}>O professor pausou a atividade momentaneamente.</p>
          </div>
        );

      case 'ended':
        return (
          <div className="flex-center flex-column animate-fade-in-up" style={styles.content}>
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
    color: 'var(--text-cream)',
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
    backgroundColor: 'var(--amber)',
    color: 'var(--dark-brown)',
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
    color: 'var(--amber)',
  },
  subtitle: {
    fontSize: '14px',
    textAlign: 'center',
    color: 'var(--text-muted)',
    marginBottom: '32px',
    lineHeight: '1.5',
  },
  primaryButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: 'var(--amber)',
    color: 'var(--dark-brown)',
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
    color: 'var(--text-muted)',
    border: '1px solid var(--text-muted)',
    borderRadius: '9999px',
    fontWeight: '600',
    marginTop: '10px',
  },
  userBadge: {
    backgroundColor: 'rgba(244, 169, 0, 0.1)',
    padding: '12px 20px',
    borderRadius: '12px',
    color: 'var(--amber)',
    fontSize: '13px',
    marginBottom: '24px',
    border: '1px solid rgba(244, 169, 0, 0.3)',
  },
  historyBanner: {
    width: '100%',
    backgroundColor: 'var(--amber)',
    color: 'var(--dark-brown)',
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
    color: 'var(--text-muted)',
    fontSize: '14px',
  },
} as any;

export default App;
