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
        const command = payload.command;        if (command === 'START') {
          console.log(`[FloatingPanel] SESSION_START received:`, payload);
          setMode(payload.mode || null);
          setModeSegmentId(payload.modeSegmentId || null);
          setStatus('recording');
          
          if (payload.mode) {
              console.log(`[FloatingPanel] Valid mode detected: ${payload.mode}`);
          } else {
              console.warn(`[FloatingPanel] START command received without mode!`);
          }

          speechService.start(stateRef.current.lang, (text, isFinal) => {
            setInterimTranscript(text);
            const { sessionId: currentSid, studentId: currentStid, mode: currentMode, modeSegmentId: currentSegmentId, lang: currentLang } = stateRef.current;

            // Extra verbose logging on speech events
            if (isFinal) {
                console.log(`[FloatingPanel] Final text captured: "${text.substring(0, 30)}..."`);
            }

            if (isFinal && currentSid && currentStid) {
              console.log(`[FloatingPanel] Sending TRANSCRIPTION_FRAGMENT to server...`, {
                  studentId: currentStid,
                  mode: currentMode,
                  modeSegmentId: currentSegmentId
              });
              
              socketService.send({
                type: 'TRANSCRIPTION_FRAGMENT',
                sessionId: currentSid,
                payload: {
                  text,
                  isFinal: true,
                  lang: currentLang,
                  mode: currentMode,
                  modeSegmentId: currentSegmentId,
                  studentId: currentStid, // Crucial: associated data with a student
                },
                timestamp: Date.now(),
              });
              setInterimTranscript('');
            }
          });
        } else if (command === 'PAUSE') {
          console.log(`[FloatingPanel] PAUSE command received`);
          speechService.pause();
          setStatus('paused');
        } else if (command === 'STOP') {
          console.log(`[FloatingPanel] STOP command received`);
          speechService.stop();
          setInterimTranscript('');
          setMode(null);
          setModeSegmentId(null);
          setStatus('waiting');
        } else if (command === 'SWITCH_SPEAKER') {
          console.log(`[FloatingPanel] SWITCH_SPEAKER: target is ${payload.targetStudentId}`);
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
                    studentId: currentStid,
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

  // State update logger for real-time debugging in the browser console
  useEffect(() => {
     console.log(`[FloatingPanel] DEBUG SYNC: status=${status}, mode=${mode}`);
  }, [status, mode]);

  // Robust check for History Mode that handles accents and case (Regex-based extreme normalization)
  const isHistoryMode = React.useMemo(() => {
    if (!mode) return false;
    // Normalize to handle 'HISTÓRIA', 'historia', 'History', etc.
    const normalized = mode.toString()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim();
        
    return normalized === 'history' || normalized === 'historia';
  }, [mode]);

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '80px',
    right: '16px',
    width: '320px',
    backgroundColor: isHistoryMode && status === 'recording' ? '#FFF9F0' : 'rgba(250, 245, 238, 0.9)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: isHistoryMode && status === 'recording' ? '4px solid #F4A900' : '1px solid rgba(212, 184, 150, 0.5)',
    borderRadius: '28px',
    padding: '0',
    overflow: 'hidden',
    boxShadow: isHistoryMode && status === 'recording' 
        ? '0 20px 50px rgba(244, 169, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.2) inset'
        : '0 12px 40px rgba(0, 0, 0, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
    fontFamily: '"Outfit", "Inter", -apple-system, sans-serif',
    zIndex: 10000,
    transition: 'all 0.5s cubic-bezier(0.19, 1, 0.22, 1)',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#2C2420',
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
    backgroundColor: '#F4A900',
    color: '#2C2420',
    border: 'none',
    borderRadius: '9999px',
    fontWeight: '700',
    fontSize: '14px',
    cursor: 'pointer',
    boxShadow: '0 4px 14px rgba(244, 169, 0, 0.3)',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const logoStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '24px'
  };

  const pulseStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#C1666B',
    marginRight: '8px',
    animation: 'pulse 1.5s ease-in-out infinite',
  };

  const [elapsedTime, setElapsedTime] = useState(0);

  // Timer for History Mode
  useEffect(() => {
    let timer: number | undefined;
    if (status === 'recording' && isHistoryMode) {
      timer = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    } else {
      setElapsedTime(0);
      if (timer) clearInterval(timer);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [status, isHistoryMode]);

  const formatTime = (s: number) => {
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const renderContent = () => {
    switch (status) {
      case 'unsupported':
        return (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🚫</div>
            <h3 style={titleStyle}>Não suportado</h3>
            <p style={textStyle}>Infelizmente, seu navegador não suporta as APIs necessárias. Use o Google Chrome para participar.</p>
          </div>
        );

      case 'mic-denied':
        return (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>🎤</div>
            <h3 style={titleStyle}>Microfone bloqueado</h3>
            <p style={textStyle}>
              Habilite o acesso ao microfone nas configurações do seu navegador para continuar.
            </p>
          </div>
        );

      case 'idle':
        return (
          <div style={{ padding: '24px' }}>
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
                <span style={{ color: '#2C2420', fontWeight: 'bold' }}>P</span>
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
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#2C2420" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#2C2420" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#2C2420" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#2C2420" />
              </svg>
              {isAuthLoading ? 'Autenticando...' : 'Entrar com Google'}
            </button>
          </div>
        );

      case 'authenticating':
        return (
          <div style={{ textAlign: 'center', padding: '44px 24px' }}>
            <div className="lds-ring"><div></div><div></div><div></div><div></div></div>
            <p style={{...textStyle, marginTop: '20px'}}>Autenticando...</p>
          </div>
        );

      case 'waiting':
        return (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>⏳</div>
            <h3 style={titleStyle}>Tudo pronto</h3>
            <p style={textStyle}>O professor está preparando o ambiente. Aguarde um instante.</p>
            <div style={{
              backgroundColor: '#EDE0D0', 
              fontWeight: 'bold',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#2C2420',
              marginBottom: '24px',
              padding: '14px',
              borderRadius: '16px',
              fontSize: '11px',
              border: '1px solid #D4B896'
            }}>
              LOGADO COMO <strong>{userName || googleEmail?.split('@')[0]}</strong>
            </div>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#C1666B', // Terracotta
                color: '#FFFFFF',
                boxShadow: '0 4px 14px rgba(193, 102, 107, 0.3)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#A0484D';
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#C1666B';
                e.currentTarget.style.transform = 'none';
              }}
              onClick={async () => {
                const stId = studentId || googleEmail || 'unknown';
                socketService.send({
                  type: 'STUDENT_DISCONNECTED',
                  sessionId: meetingCode,
                  payload: { userId: stId, name: userName },
                  timestamp: Date.now()
                });
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
        console.log(`[FloatingPanel] Rendering recording state. Mode: ${mode}, isHistoryMode: ${isHistoryMode}`);
        return (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* History Mode Banner */}
            {isHistoryMode && (
              <div style={{
                background: 'linear-gradient(90deg, #F4A900 0%, #FFD200 100%)',
                padding: '16px 24px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(0,0,0,0.05)',
                boxShadow: '0 4px 12px rgba(244, 169, 0, 0.2)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div className="recording-dot"></div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: '900', 
                    color: '#2C2420', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.15em',
                    textShadow: '0 1px 0 rgba(255,255,255,0.3)'
                  }}>
                    História Ativa
                  </span>
                </div>
                <div style={{
                  backgroundColor: '#2C2420',
                  color: '#F4A900',
                  fontSize: '15px',
                  fontWeight: '900',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontFamily: '"JetBrains Mono", monospace',
                  minWidth: '60px',
                  textAlign: 'center',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                }}>
                  {formatTime(elapsedTime)}
                </div>
              </div>
            )}

            <div style={{ padding: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  {!isHistoryMode && <div style={pulseStyle}></div>}
                  <h3 style={{ ...titleStyle, marginBottom: 0, fontSize: isHistoryMode ? '16px' : '20px' }}>
                    {isHistoryMode ? 'SUA NARRATIVA' : 'Sessão Ativa'}
                  </h3>
                </div>
                {status === 'recording' && (
                   <span style={{ 
                     fontSize: '9px', 
                     backgroundColor: isHistoryMode ? '#2C2420' : '#F4A900',
                     color: isHistoryMode ? '#F4A900' : '#2C2420',
                     padding: '2px 8px',
                     borderRadius: '4px',
                     fontWeight: '900',
                     letterSpacing: '0.05em'
                   }}>LIVE</span>
                )}
              </div>
              
              <div style={{
                padding: '24px',
                backgroundColor: isHistoryMode ? '#FFFFFF' : '#FDFBF7',
                borderRadius: '24px',
                minHeight: '140px',
                boxShadow: isHistoryMode 
                    ? '0 10px 30px rgba(244, 169, 0, 0.1), inset 0 2px 4px rgba(0,0,0,0.02)' 
                    : '0 8px 24px rgba(0,0,0,0.04)',
                border: isHistoryMode ? '2px solid #F4A900' : '1px solid #EDE0D0',
                marginBottom: '24px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: interimTranscript ? 'flex-start' : 'center',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {interimTranscript ? (
                  <p style={{
                    fontSize: '17px',
                    color: '#2C2420',
                    margin: 0,
                    lineHeight: '1.6',
                    fontWeight: '500',
                    fontStyle: isHistoryMode ? 'normal' : 'italic'
                  }}>
                    {interimTranscript}
                  </p>
                ) : (
                  <p style={{ fontSize: '15px', color: '#A09088', margin: 0, textAlign: 'center', fontWeight: '500' }}>
                    {isHistoryMode ? 'Fale para iniciar sua história...' : 'Ouvindo áudio...'}
                  </p>
                )}
                
                {interimTranscript && isHistoryMode && (
                    <div style={{
                        position: 'absolute',
                        bottom: '12px',
                        right: '12px',
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: '#F4A900',
                        opacity: 0.6
                    }}></div>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <MicStatus status="active" />
                <span style={{ 
                  fontSize: '11px', 
                  fontWeight: '800', 
                  color: isHistoryMode ? '#F4A900' : '#8C7B72', 
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em'
                }}>
                  {status === 'recording' ? 'Microfone Ativo' : 'Aguardando'}
                </span>
              </div>
            </div>
          </div>
        );

      case 'paused':
        return (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏸️</div>
            <h3 style={titleStyle}>Sessão Pausada</h3>
            <p style={textStyle}>O professor pausou a atividade momentaneamente.</p>
            <MicStatus status="paused" />
          </div>
        );

      case 'ended':
        return (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <div style={{ fontSize: '48px', marginBottom: '24px' }}>🎓</div>
            <h3 style={titleStyle}>Sessão Finalizada</h3>
            <p style={textStyle}>Excelente participação! Seus dados foram salvos para análise posterior.</p>
            <button
              style={buttonStyle}
              onClick={() => setStatus('waiting')}
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
    <div style={panelStyle} className={`polyglan-floating-panel ${isHistoryMode && status === 'recording' ? 'history-mode' : ''}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;800;900&display=swap');
        
        .polyglan-floating-panel {
          font-family: 'Outfit', sans-serif;
        }

        .history-mode {
          animation: history-glow 3s infinite cubic-bezier(0.4, 0, 0.2, 1);
        }
        
        .recording-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background-color: #2C2420;
          box-shadow: 0 0 0 rgba(44, 36, 32, 0.4);
          animation: dot-pulse 1.5s infinite;
        }

        @keyframes dot-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(44, 36, 32, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(44, 36, 32, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(44, 36, 32, 0);
          }
        }

        @keyframes history-glow {
          0% {
            box-shadow: 0 20px 50px rgba(244, 169, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          }
          50% {
            box-shadow: 0 20px 70px rgba(244, 169, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.2) inset;
          }
          100% {
            box-shadow: 0 20px 50px rgba(244, 169, 0, 0.15), 0 0 0 1px rgba(255, 255, 255, 0.1) inset;
          }
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
        .lds-ring div:nth-child(1) {
          animation-delay: -0.45s;
        }
        .lds-ring div:nth-child(2) {
          animation-delay: -0.3s;
        }
        .lds-ring div:nth-child(3) {
          animation-delay: -0.15s;
        }
        @keyframes lds-ring {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0% {
            transform: scale(1);
            box-shadow: 0 0 0 0 rgba(193, 102, 107, 0.7);
          }
          70% {
            transform: scale(1.2);
            box-shadow: 0 0 0 12px rgba(193, 102, 107, 0);
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
