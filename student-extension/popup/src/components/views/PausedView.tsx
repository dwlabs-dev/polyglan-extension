import React from 'react';
import { Pause } from 'lucide-react';
import { sharedStyles } from '../AppStyles';

interface PausedViewProps {
  // Add props if needed for future expansion
}

const pausedStyles: { [key: string]: React.CSSProperties } = {
  icon: {
    marginBottom: '24px',
    color: 'var(--amber)',
  }
};

const PausedView: React.FC<PausedViewProps> = () => {
  return (
    <div className="flex-center flex-column animate-fade-in-up" style={sharedStyles.content}>
      <Pause size={48} style={pausedStyles.icon} />
      <h2 style={sharedStyles.title}>Sessão Pausada</h2>
      <p style={sharedStyles.subtitle}>O professor pausou a atividade momentaneamente.</p>
    </div>
  );
};

export default PausedView;
