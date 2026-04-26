import React from 'react';
import { MicOff } from 'lucide-react';
import { sharedStyles } from '../AppStyles';
import { useSessionTranscript, useMicPermission } from '../../hooks/useSession';

interface RecordingViewProps {
  mode?: string;
  isHistory?: boolean;
}

const recordingStyles: { [key: string]: React.CSSProperties } = {
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
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    width: '100%',
    alignItems: 'center',
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
  muteContainer: {
    textAlign: 'center',
    color: 'var(--accent-red)',
    fontWeight: 'bold',
    fontSize: '18px',
    marginBottom: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
};

const RecordingView: React.FC<RecordingViewProps> = ({ mode, isHistory }) => {
  const interimTranscript = useSessionTranscript();
  const micGranted = useMicPermission();

  return (
    <div className="flex-column animate-fade-in-up" style={{ ...sharedStyles.content, alignItems: 'stretch' }}>
      {isHistory && (
        <div style={recordingStyles.historyBanner}>
          <span>HISTÓRIA ATIVA</span>
        </div>
      )}
      <div style={recordingStyles.header}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '800' }}>
          {isHistory ? 'SUA NARRATIVA' : 'Sessão Ativa'}
        </h2>
        <span className="live-badge">LIVE</span>
      </div>

      <div style={recordingStyles.transcriptBox}>
        {!micGranted ? (
          <div style={{ textAlign: 'center' }}>
            <div style={recordingStyles.muteContainer}>
              <MicOff size={24} />
              MUDO
            </div>
            <p style={recordingStyles.placeholderText}>O professor não consegue te ouvir.<br />Ative o microfone no canto superior.</p>
          </div>
        ) : interimTranscript ? (
          <p style={recordingStyles.transcriptText}>{interimTranscript}</p>
        ) : (
          <p style={recordingStyles.placeholderText}>Ouvindo áudio...</p>
        )}
      </div>
    </div>
  );
};

export default RecordingView;
