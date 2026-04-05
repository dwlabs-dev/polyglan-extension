import React, { useEffect, useState } from 'react';
import { authService } from '../services/auth.service';
import { speechService } from '../services/speech.service';
import { socketService } from '../services/socket.service';
import { SessionMode, WsMessage, SupportedLang } from '../types/index';
import MicStatus from './MicStatus';
import FeedbackPanel from './FeedbackPanel';

type FloatingPanelStatus = 'idle' | 'authenticating' | 'waiting' | 'recording' | 'paused' | 'ended' | 'unsupported' | 'mic-denied';

interface Feedback {
  id: string;
  text: string;
  level: 'info' | 'warning' | 'success';
  timestamp: number;
}

// Robust message sender to avoid "Receiving end does not exist" errors
const safeSendMessage = async (action: string, payload: any = {}): Promise<any> => {
  return new Promise((resolve, reject) => {
    try {
      if (!chrome.runtime?.id) {
        reject(new Error('Extension context invalidated. Please reload the page.'));
        return;
      }

      chrome.runtime.sendMessage({ action, ...payload }, (response) => {
        const error = chrome.runtime.lastError;
        if (error) {
          console.warn(`[safeSendMessage] Error sending ${action}:`, error.message);
          reject(new Error(error.message));
          return;
        }
        resolve(response);
      });
    } catch (e) {
      reject(e);
    }
  });
};

const FloatingPanel: React.FC = () => {
  const [status, setStatus] = useState<FloatingPanelStatus>('idle');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [mode, setMode] = useState<SessionMode | null>(null);
  const [modeSegmentId, setModeSegmentId] = useState<string | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<Feedback[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [lang, setLang] = useState<SupportedLang>('pt-BR');
  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Extract meeting code from URL
  const getMeetingCode = () => {
    const path = window.location.pathname.replace(/\//g, '');
    // Basic validation: 10 chars, typically 3-4-3 format with hyphens
    if (path.length >= 10 && path.includes('-')) {
      return path.replace(/-/g, '').toLowerCase().trim();
    }
    return '';
  };

  const meetingCode = getMeetingCode();

  // Refs to avoid stale closures in WebSocket/Speech handlers
  const stateRef = React.useRef({
    mode,
    modeSegmentId,
    lang,
    sessionId,
    studentId,
    userName
  });

  useEffect(() => {
    stateRef.current = { mode, modeSegmentId, lang, sessionId, studentId, userName };
  }, [mode, modeSegmentId, lang, sessionId, studentId, userName]);

  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      if (!speechService.isSupported()) {
        setStatus('unsupported');
        return;
      }

      const token = await authService.getToken();
      if (token) {
        const userId = await authService.getGoogleUserId() || await authService.getStudentId();
        const language = await authService.getLang();
        const email = await authService.getGoogleEmail();
        const name = await chrome.storage.local.get('userName').then((r: any) => r.userName || '');

        if (userId) {
          setStudentId(userId);
          setSessionId(meetingCode);
          setLang(language);
          setGoogleEmail(email);
          setUserName(name);
          setStatus('waiting');
          socketService.connect(meetingCode, userId, name);
          setupWebSocketHandlers();
        }
      }
    };

    init();
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    try {
      // Step 1: Get authorization code from service worker using safeSendMessage
      const response = await safeSendMessage('authenticateWithGoogle');

      if (!response || !response.success) {
        throw new Error(response?.error || 'Authentication failed');
      }

      const authCode = response.data.authCode;
      const extensionId = chrome.runtime.id;
      const redirectUri = `https://${extensionId}.chromiumapp.org/`;

      // Step 2: Exchange authorization code for session token on backend
      const apiUrl = import.meta.env.VITE_API_URL;
      const authStudentResponse = await fetch(`${apiUrl}/api/auth/student`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ authCode, redirectUri }),
      });

      if (!authStudentResponse.ok) {
        const errorData = await authStudentResponse.json();
        throw new Error(errorData.message || 'Student authentication failed');
      }

      const authData = await authStudentResponse.json();

      if (authData.status !== 'success') {
        throw new Error(authData.message || 'Student authentication failed');
      }

      // Step 3: Save token and sessionId to chrome storage
      const { token, lang: newLang, email, googleUserId } = authData;

      await authService.setToken(token);
      await authService.setGoogleEmail(email);
      await authService.setGoogleUserId(googleUserId);
      await authService.setLang(newLang);

      // Step 4: Set local state and transition to waiting
      const stId = googleUserId || authData.studentId || email || 'unknown-student';
      await authService.setStudentId(stId);
      await chrome.storage.local.set({ userId: stId, userName: authData.name });

      setStudentId(stId);
      setSessionId(meetingCode);
      setLang(newLang);
      setGoogleEmail(email);
      setUserName(authData.name);
      setStatus('waiting');

      // Step 5: Connect to WebSocket
      socketService.connect(meetingCode, stId, authData.name);
      setupWebSocketHandlers();

      console.log(`[FloatingPanel] Student authenticated: ${email} (${stId})`);
    } catch (error) {
      console.error('[FloatingPanel] Authentication error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao autenticar';
      alert(`Erro na autenticação: ${errorMessage}`);
      setStatus('idle');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const setupWebSocketHandlers = () => {
    socketService.onMessage((message: WsMessage) => {
      if (message.type === 'SESSION_COMMAND') {
        const payload = message.payload as any;
        const command = payload.command;

        if (command === 'START') {
          setMode(payload.mode);
          setModeSegmentId(payload.modeSegmentId);
          setStatus('recording');
          speechService.start(stateRef.current.lang, (text, isFinal) => {
            setInterimTranscript(text);
            const { sessionId: currentSid, studentId: currentStid, mode: currentMode, modeSegmentId: currentSegmentId, lang: currentLang } = stateRef.current;

            if (isFinal && currentSid && currentStid) {
              socketService.send({
                type: 'TRANSCRIPTION_FRAGMENT',
                sessionId: currentSid,
                payload: {
                  text,
                  isFinal: true,
                  lang: currentLang,
                  mode: currentMode,
                  modeSegmentId: currentSegmentId,
                },
                timestamp: Date.now(),
              });
              setInterimTranscript('');
            }
          });
        } else if (command === 'PAUSE') {
          speechService.pause();
          setStatus('paused');
          setMode(null);
          setModeSegmentId(null);
        } else if (command === 'STOP') {
          speechService.stop();
          setStatus('ended');
          setMode(null);
          setModeSegmentId(null);
        } else if (command === 'SWITCH_SPEAKER') {
          if (payload.targetStudentId === stateRef.current.studentId) {
            speechService.start(stateRef.current.lang, (text, isFinal) => {
              setInterimTranscript(text);
              const { sessionId: currentSid, studentId: currentStid, mode: currentMode, modeSegmentId: currentSegmentId, lang: currentLang } = stateRef.current;

              if (isFinal && currentSid && currentStid) {
                socketService.send({
                  type: 'TRANSCRIPTION_FRAGMENT',
                  sessionId: currentSid,
                  payload: {
                    text,
                    isFinal: true,
                    lang: currentLang,
                    mode: currentMode,
                    modeSegmentId: currentSegmentId,
                  },
                  timestamp: Date.now(),
                });
                setInterimTranscript('');
              }
            });
          }
        }
      } else if (message.type === 'FEEDBACK') {
        const feedbackPayload = message.payload as any;
        const newFeedback: Feedback = {
          id: `${Date.now()}-${Math.random()}`,
          text: feedbackPayload.text,
          level: feedbackPayload.level,
          timestamp: Date.now(),
        };
        setFeedbackMessages((prev: Feedback[]) => [...prev, newFeedback]);

        setTimeout(() => {
          setFeedbackMessages((prev: Feedback[]) =>
            prev.filter((f: Feedback) => f.id !== newFeedback.id)
          );
        }, 10000);
      }
    });
  };

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '80px',
    right: '16px',
    width: '320px', // slightly wider for better readability
    backgroundColor: 'rgba(250, 245, 238, 0.85)', // Glassy cream
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid rgba(212, 184, 150, 0.4)',
    borderRadius: '24px',
    padding: '24px',
    boxShadow: '0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
    zIndex: 10000,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2C2420', // Charcoal
    lineHeight: '1.2',
    marginBottom: '16px',
    letterSpacing: '-0.02em',
  };

  const textStyle: React.CSSProperties = {
    fontSize: '15px',
    color: '#5D5048',
    lineHeight: '1.5',
    marginBottom: '20px',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '12px 20px',
    backgroundColor: '#F4A900', // Gold
    color: '#1A1614',
    border: 'none',
    borderRadius: '14px',
    fontWeight: '600',
    fontSize: '15px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(244, 169, 0, 0.3)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px'
  };

  const pulseStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#C1666B', // Elegant Red for recording
    marginRight: '8px',
    animation: 'pulse 2s infinite cubic-bezier(0.4, 0, 0.6, 1)',
  };

  const renderContent = () => {
    switch (status) {
      case 'unsupported':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚫</div>
            <h3 style={titleStyle}>Não suportado</h3>
            <p style={textStyle}>Infelizmente, seu navegador não suporta as APIs necessárias. Use o Google Chrome para participar.</p>
          </div>
        );

      case 'mic-denied':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎤</div>
            <h3 style={titleStyle}>Microfone bloqueado</h3>
            <p style={textStyle}>
              Habilite o acesso ao microfone nas configurações do seu navegador para continuar.
            </p>
          </div>
        );

      case 'idle':
        return (
          <div>
            <div style={logoStyle}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: '#F4A900',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{ color: 'white', fontWeight: 'bold' }}>P</span>
              </div>
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#2C2420' }}>POLYGLAN</span>
            </div>
            <h3 style={titleStyle}>Aprenda sem fronteiras</h3>
            <p style={textStyle}>Conecte sua conta para iniciar sua jornada de aprendizado assistido com transcrição em tempo real.</p>
            <button
              style={{
                ...buttonStyle,
                opacity: isAuthLoading ? 0.8 : 1,
                transform: isAuthLoading ? 'scale(0.98)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isAuthLoading) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(244, 169, 0, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isAuthLoading) {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 4px 14px rgba(244, 169, 0, 0.3)';
                }
              }}
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#1A1614" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#1A1614" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#1A1614" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#1A1614" />
              </svg>
              {isAuthLoading ? 'Autenticando...' : 'Entrar com Google'}
            </button>
          </div>
        );

      case 'authenticating':
        return (
          <div>
            <p style={textStyle}>Autenticando...</p>
          </div>
        );

      case 'waiting':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
            <h3 style={titleStyle}>Tudo pronto</h3>
            <p style={textStyle}>Aguardando o professor iniciar a sessão...</p>
            <div style={{
              backgroundColor: '#F4A900', // Mustard Yellow
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.15em',
              color: '#2C2420',           // Dark Brown text
              marginBottom: '16px',
              padding: '12px',
              borderRadius: '12px',
              fontSize: '13px'
            }}>
              CONECTADO COMO <strong>{userName || googleEmail}</strong>
            </div>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#C1666B', // Terracotta
                color: '#FFFFFF',           // White text
                boxShadow: '0 4px 14px rgba(193, 102, 107, 0.3)',
                marginTop: '8px',
                fontSize: '13px',
                letterSpacing: '0.15em',
                borderRadius: '9999px',     // Pill shape
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#A0484D'; // Dark Terracotta
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#C1666B';
                e.currentTarget.style.transform = 'none';
              }}
              onClick={async () => {
                // Determine user ID
                const stId = studentId || googleEmail || 'unknown';

                // Send disconnect message
                socketService.send({
                  type: 'STUDENT_DISCONNECTED',
                  sessionId: meetingCode,
                  payload: { userId: stId, name: userName },
                  timestamp: Date.now()
                });

                // Small delay to ensure message goes through before killing connection
                setTimeout(async () => {
                  socketService.disconnect();
                  await authService.clear();
                  setStatus('idle');
                  setGoogleEmail(null);
                  setUserName(null);
                  setStudentId(null);
                  setSessionId(null);
                }, 100);
              }}
            >
              Encerrar Sessão
            </button>
          </div>
        );

      case 'recording':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
              <div style={pulseStyle}></div>
              <h3 style={{ ...titleStyle, marginBottom: 0 }}>Sessão Ativa</h3>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
              borderRadius: '16px',
              minHeight: '80px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
            }}>
              {interimTranscript ? (
                <p style={{
                  fontSize: '14px',
                  color: '#2C2420',
                  margin: 0,
                  fontStyle: 'italic',
                  lineHeight: '1.5'
                }}>
                  "{interimTranscript}..."
                </p>
              ) : (
                <p style={{ fontSize: '13px', color: '#9D8977', margin: 0 }}>Capto áudio em tempo real...</p>
              )}
            </div>
            <div style={{ marginTop: '16px' }}>
              <MicStatus status="active" />
            </div>
          </div>
        );

      case 'paused':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏸️</div>
            <h3 style={titleStyle}>Sessão Pausada</h3>
            <p style={textStyle}>O professor pausou a transcrição momentaneamente.</p>
            <MicStatus status="paused" />
          </div>
        );

      case 'ended':
        return (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎓</div>
            <h3 style={titleStyle}>Sessão Finalizada</h3>
            <p style={textStyle}>Resumo e notas estarão disponíveis em breve.</p>
            <button
              style={buttonStyle}
              onClick={() => setStatus('idle')}
            >
              Voltar ao Início
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={panelStyle} className="polyglan-floating-panel">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800&display=swap');
        
        .polyglan-floating-panel {
          font-family: 'Outfit', sans-serif;
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(193, 102, 107, 0.7);
          }
          70% {
            transform: scale(1.1);
            box-shadow: 0 0 0 10px rgba(193, 102, 107, 0);
          }
          100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(193, 102, 107, 0);
          }
        }
      `}</style>
      {renderContent()}
      <FeedbackPanel messages={feedbackMessages} />
    </div>
  );
};

export default FloatingPanel;
