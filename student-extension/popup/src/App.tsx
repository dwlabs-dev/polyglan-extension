import React from 'react';
import { useSession } from './hooks/useSession';
import {
  Mic,
  MicOff,
  Loader2,
  AlertCircle,
  Clock,
  Pause,
  GraduationCap
} from 'lucide-react';

const App: React.FC = () => {
  const { state, micGranted, login, logout, isLoading, unlockAudio } = useSession();

  if (isLoading) {
    return (
      <div className="flex-center flex-column" style={{ minHeight: '450px' }}>
        <Loader2 className="animate-spin" size={48} color="var(--amber)" />
        <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
          Carregando...
        </p>
      </div>
    );
  }

  if (!state) return null;

  // Lógica para definir o estilo do container baseado no microfone e gravação
  const isRecording = state.status === 'recording' && micGranted;
  const containerStyle = {
    ...styles.container,
    border: isRecording ? '2px solid var(--accent-red)' : '2px solid transparent',
    boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
    transition: 'all 0.3s ease'
  };

  // Renderiza as ações do topo (Microfone e REC)
  const renderHeaderActions = () => (
    <div style={styles.headerActions}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          console.log('Botão de microfone clicado');
          unlockAudio();
        }}
        style={{
          ...styles.iconButton,
          color: micGranted ? 'var(--amber)' : 'var(--accent-red)',
          backgroundColor: micGranted ? 'rgba(244, 169, 0, 0.1)' : 'rgba(239, 68, 68, 0.1)',
          cursor: 'pointer',
          pointerEvents: 'auto'
        }}
        title={micGranted ? "Microfone Ativo" : "Microfone Mutado - Clique para Ativar"}
      >
        {micGranted ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      {isRecording && (
        <div className="animate-pulse" style={styles.recIndicator}>
          <div className="recording-dot"></div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>REC</span>
        </div>
      )}
    </div>
  );

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
            <Clock size={48} color="var(--amber)" style={{ marginBottom: '24px' }} />
            <h2 style={styles.title}>Tudo pronto</h2>
            <p style={styles.subtitle}>O professor está preparando o ambiente. Aguarde um instante.</p>

            {!micGranted && (
              <div style={styles.subtleAlert}>
                <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                <span style={{ fontSize: '12px' }}>Clique no ícone de microfone acima para habilitar sua voz.</span>
              </div>
            )}

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
              {!micGranted ? (
                <div style={{ textAlign: 'center' }}>
                  <div style={{ color: 'var(--accent-red)', fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    <MicOff size={24} />
                    MUDO
                  </div>
                  <p style={styles.placeholderText}>O professor não consegue te ouvir.<br />Ative o microfone no canto superior.</p>
                </div>
              ) : state.interimTranscript ? (
                <p style={styles.transcriptText}>{state.interimTranscript}</p>
              ) : (
                <p style={styles.placeholderText}>Ouvindo áudio...</p>
              )}
            </div>
          </div>
        );

      case 'paused':
        return (
          <div className="flex-center flex-column animate-fade-in-up" style={styles.content}>
            <Pause size={48} color="var(--amber)" style={{ marginBottom: '24px' }} />
            <h2 style={styles.title}>Sessão Pausada</h2>
            <p style={styles.subtitle}>O professor pausou a atividade momentaneamente.</p>
          </div>
        );

      case 'ended':
        return (
          <div className="flex-center flex-column animate-fade-in-up" style={styles.content}>
            <GraduationCap size={48} color="var(--amber)" style={{ marginBottom: '24px' }} />
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
    <div style={containerStyle}>
      {state.status !== 'idle' && renderHeaderActions()}
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
    position: 'relative',
    borderRadius: '24px',
    backgroundColor: 'var(--dark-brown)',
    overflow: 'hidden',
  },
  headerActions: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999, // Força ficar acima de qualquer banner ou conteúdo
    pointerEvents: 'none', // Permite que cliques passem pelo container, mas não pelos botões
  },
  iconButton: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
  },
  recIndicator: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    padding: '6px 12px',
    borderRadius: '20px',
    color: 'var(--accent-red)',
    pointerEvents: 'auto',
  },
  subtleAlert: {
    padding: '12px',
    borderRadius: '12px',
    backgroundColor: 'rgba(239, 68, 68, 0.05)',
    color: 'var(--text-muted)',
    marginBottom: '20px',
    textAlign: 'center',
    width: '100%',
    border: '1px dashed rgba(239, 68, 68, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    zIndex: 1,
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
    cursor: 'pointer',
    transition: 'transform 0.2s ease, opacity 0.2s ease',
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
    cursor: 'pointer',
    transition: 'transform 0.2s ease, opacity 0.2s ease',
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
    textAlign: 'center',
  },
} as any;

export default App;