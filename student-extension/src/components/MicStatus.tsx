import React from 'react';

interface MicStatusProps {
  status: 'active' | 'paused' | 'denied';
}

const MicStatus: React.FC<MicStatusProps> = ({ status }) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    fontWeight: '500',
    color: '#4A403A',
  };

  const dotStyle: React.CSSProperties = {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    display: 'inline-block',
  };

  const activeDot: React.CSSProperties = {
    ...dotStyle,
    backgroundColor: '#4CAF50',
  };

  const pausedDot: React.CSSProperties = {
    ...dotStyle,
    backgroundColor: '#999999',
  };

  const deniedDot: React.CSSProperties = {
    ...dotStyle,
    backgroundColor: '#C1666B',
  };

  const getLabel = () => {
    switch (status) {
      case 'active':
        return 'Gravando';
      case 'paused':
        return 'Pausado';
      case 'denied':
        return 'Microfone bloqueado';
      default:
        return '';
    }
  };

  const getDot = () => {
    switch (status) {
      case 'active':
        return activeDot;
      case 'paused':
        return pausedDot;
      case 'denied':
        return deniedDot;
      default:
        return dotStyle;
    }
  };

  return (
    <div style={containerStyle}>
      <div style={getDot()}></div>
      <span>{getLabel()}</span>
    </div>
  );
};

export default MicStatus;
