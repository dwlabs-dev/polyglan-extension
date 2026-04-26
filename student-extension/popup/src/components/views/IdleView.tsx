import React from 'react';
import { GraduationCap } from 'lucide-react';
import { sharedStyles } from '../AppStyles';
import { useSessionActions } from '../../hooks/useSession';

interface IdleViewProps {}

const idleStyles: { [key: string]: React.CSSProperties } = {
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
};

const IdleView: React.FC<IdleViewProps> = () => {
  const { login } = useSessionActions();

  return (
    <div className="flex-center flex-column animate-fade-in-up" style={sharedStyles.content}>
      <div style={idleStyles.logoContainer}>
        <div style={idleStyles.logoIcon}>P</div>
        <h1 style={sharedStyles.title}>POLYGLAN</h1>
      </div>
      <p style={sharedStyles.subtitle}>Aprenda sem fronteiras. Conecte sua conta para iniciar.</p>
      <button style={sharedStyles.primaryButton} onClick={login}>
        Entrar com Google
      </button>
    </div>
  );
};

export default IdleView;
