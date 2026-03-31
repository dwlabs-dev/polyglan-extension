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
    const path = window.location.pathname.replace('/', '');
    // Basic validation: 10 chars, typically 3-4-3 format with hyphens
    if (path.length >= 10 && path.includes('-')) {
      return path;
    }
    return 'default-session';
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
        const stId = await authService.getStudentId();
        const language = await authService.getLang();
        const email = await authService.getGoogleEmail();
        const name = await chrome.storage.local.get('userName').then((r: any) => r.userName || '');

        if (stId) {
          setStudentId(stId);
          setSessionId(meetingCode);
          setLang(language);
          setGoogleEmail(email);
          setUserName(name);
          setStatus('waiting');
          socketService.connect(meetingCode, stId, name);
          setupWebSocketHandlers();
        }
      }
    };

    init();
  }, []);

  const handleGoogleLogin = async () => {
    setIsAuthLoading(true);
    try {
      // Step 1: Get authorization code from service worker
      const authResponse = await new Promise<{ authCode: string }>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'authenticateWithGoogle' },
          (response: any) => {
            if (response.success) {
              resolve(response.data);
            } else {
              reject(new Error(response.error || 'Authentication failed'));
            }
          }
        );
      });

      const authCode = authResponse.authCode;
      const extensionId = chrome.runtime.id;
      const redirectUri = `https://${extensionId}.chromiumapp.org/`;

      // Step 2: Exchange authorization code for session token on backend
      const apiUrl = import.meta.env.VITE_API_URL || 'https://tubes-prix-balloon-configuration.trycloudflare.com';
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
      const { token, lang: newLang, email } = authData;

      await authService.setToken(token);
      await authService.setGoogleEmail(email);
      await authService.setLang(newLang);

      // Step 4: Set local state and transition to waiting
      const stId = authData.studentId || authData.email || 'unknown-student';
      await chrome.storage.local.set({ userName: authData.name });

      setStudentId(stId);
      setSessionId(meetingCode);
      setLang(newLang);
      setGoogleEmail(email);
      setUserName(authData.name);
      setStatus('waiting');

      // Step 5: Connect to WebSocket
      socketService.connect(meetingCode, stId, authData.name);
      setupWebSocketHandlers();

      console.log(`[FloatingPanel] Student authenticated: ${email}`);
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
    width: '280px',
    backgroundColor: '#FAF5EE',
    border: '1px solid #D4B896',
    borderRadius: '16px',
    padding: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    zIndex: 10000,
  };

  const titleStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: '600',
    color: '#2C2420',
    marginBottom: '12px',
    margin: 0,
  };

  const textStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#4A403A',
    marginBottom: '12px',
    textAlign: 'center',
  };

  const buttonStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 16px',
    marginTop: '8px',
    backgroundColor: '#F4A900',
    color: '#2C2420',
    border: 'none',
    borderRadius: '9999px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
  };

  const pulseStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#F4A900',
    marginRight: '8px',
    animation: 'pulse 1.5s infinite',
  };

  const renderContent = () => {
    switch (status) {
      case 'unsupported':
        return (
          <div>
            <h3 style={titleStyle}>Não suportado</h3>
            <p style={textStyle}>Use o Google Chrome para participar</p>
          </div>
        );

      case 'mic-denied':
        return (
          <div>
            <h3 style={titleStyle}>Microfone bloqueado</h3>
            <p style={textStyle}>
              Habilite o microfone nas configurações do Chrome
            </p>
          </div>
        );

      case 'idle':
        return (
          <div>
            <h3 style={titleStyle}>Bem-vindo ao Polyglan</h3>
            <p style={textStyle}>Autentique-se com sua conta Google para participar</p>
            <button
              style={{
                ...buttonStyle,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                opacity: isAuthLoading ? 0.7 : 1,
                cursor: isAuthLoading ? 'not-allowed' : 'pointer',
              }}
              onClick={handleGoogleLogin}
              disabled={isAuthLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#2C2420" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#2C2420" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#2C2420" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#2C2420" />
              </svg>
              {isAuthLoading ? 'Autenticando...' : 'Login com Google'}
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
          <div>
            <p style={textStyle}>Aguardando professor iniciar...</p>
            <p style={{ ...textStyle, fontSize: '12px', marginBottom: '12px' }}>
              Conectado como: {googleEmail}
            </p>
            <button
              style={{
                ...buttonStyle,
                backgroundColor: '#C1666B',
                marginTop: '12px',
                fontSize: '12px',
                padding: '8px 12px',
              }}
              onClick={async () => {
                await authService.clear();
                setStatus('idle');
                setGoogleEmail(null);
                setUserName(null);
              }}
            >
              Fazer logout
            </button>
          </div>
        );

      case 'recording':
        return (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
              <div style={pulseStyle}></div>
              <MicStatus status="active" />
            </div>
            {interimTranscript && (
              <p
                style={{
                  fontSize: '13px',
                  color: '#4A403A',
                  fontStyle: 'italic',
                  marginBottom: '8px',
                  maxHeight: '80px',
                  overflow: 'auto',
                }}
              >
                {interimTranscript}
              </p>
            )}
          </div>
        );

      case 'paused':
        return (
          <div>
            <MicStatus status="paused" />
            <p style={textStyle}>Professor pausou a sessão</p>
          </div>
        );

      case 'ended':
        return (
          <div>
            <p style={textStyle}>Sessão encerrada. Obrigado!</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div style={panelStyle}>
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(244, 169, 0, 0.7);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(244, 169, 0, 0.2);
          }
        }
      `}</style>
      {renderContent()}
      <FeedbackPanel messages={feedbackMessages} />
    </div>
  );
};

export default FloatingPanel;
