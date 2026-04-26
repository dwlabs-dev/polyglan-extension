import React from 'react';
import { GraduationCap } from 'lucide-react';
import { sharedStyles } from '../AppStyles';

interface EndedViewProps {}

const endedStyles: { [key: string]: React.CSSProperties } = {
  icon: {
    marginBottom: '24px',
    color: 'var(--amber)',
  }
};

const EndedView: React.FC<EndedViewProps> = () => {
  const handleRestart = () => {
    window.location.reload();
  };

  return (
    <div className="flex-center flex-column animate-fade-in-up" style={sharedStyles.content}>
      <GraduationCap size={48} style={endedStyles.icon} />
      <h2 style={sharedStyles.title}>Sessão Finalizada</h2>
      <p style={sharedStyles.subtitle}>Excelente participação! Seus dados foram salvos.</p>
      <button style={sharedStyles.primaryButton} onClick={handleRestart}>
        Voltar ao Início
      </button>
    </div>
  );
};

export default EndedView;
