import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { sharedStyles } from './AppStyles';
import { useMicPermission, useSessionStatus, useSessionActions } from '../hooks/useSession';

interface HeaderProps {}

const headerStyles: { [key: string]: React.CSSProperties } = {
  headerActions: {
    position: 'absolute',
    top: '20px',
    left: '20px',
    right: '20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 9999,
    pointerEvents: 'none',
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
    cursor: 'pointer',
    pointerEvents: 'auto',
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
};

const Header: React.FC<HeaderProps> = () => {
  const micGranted = useMicPermission();
  const status = useSessionStatus();
  const { unlockAudio } = useSessionActions();

  const isRecording = status === 'recording' && micGranted;

  return (
    <div style={headerStyles.headerActions}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          unlockAudio();
        }}
        style={{
          ...headerStyles.iconButton,
          color: micGranted ? 'var(--amber)' : 'var(--accent-red)',
          backgroundColor: micGranted ? 'rgba(244, 169, 0, 0.1)' : 'rgba(239, 68, 68, 0.1)',
        }}
        title={micGranted ? "Microfone Ativo" : "Microfone Mutado - Clique para Ativar"}
      >
        {micGranted ? <Mic size={20} /> : <MicOff size={20} />}
      </button>

      {isRecording && (
        <div className="animate-pulse" style={headerStyles.recIndicator}>
          <div className="recording-dot"></div>
          <span style={{ fontSize: '10px', fontWeight: 'bold' }}>REC</span>
        </div>
      )}
    </div>
  );
};

export default Header;
