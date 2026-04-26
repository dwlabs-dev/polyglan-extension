import React from 'react';
import { Clock, AlertCircle } from 'lucide-react';
import { sharedStyles } from '../AppStyles';
import { useSessionData, useMicPermission, useSessionActions } from '../../hooks/useSession';

interface WaitingViewProps {}

const waitingStyles: { [key: string]: React.CSSProperties } = {
  icon: {
    marginBottom: '24px',
    color: 'var(--amber)',
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
  userBadge: {
    backgroundColor: 'rgba(244, 169, 0, 0.1)',
    padding: '12px 20px',
    borderRadius: '12px',
    color: 'var(--amber)',
    fontSize: '13px',
    marginBottom: '24px',
    border: '1px solid rgba(244, 169, 0, 0.3)',
  },
};

const WaitingView: React.FC<WaitingViewProps> = () => {
  const data = useSessionData();
  const micGranted = useMicPermission();
  const { logout } = useSessionActions();

  const displayName = data?.userName || data?.googleEmail?.split('@')[0] || 'Usuário';

  return (
    <div className="flex-center flex-column animate-fade-in-up" style={sharedStyles.content}>
      <Clock size={48} style={waitingStyles.icon} />
      <h2 style={sharedStyles.title}>Tudo pronto</h2>
      <p style={sharedStyles.subtitle}>O professor está preparando o ambiente. Aguarde um instante.</p>

      {!micGranted && (
        <div style={waitingStyles.subtleAlert}>
          <AlertCircle size={16} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          <span style={{ fontSize: '12px' }}>Clique no ícone de microfone acima para habilitar sua voz.</span>
        </div>
      )}

      <div style={waitingStyles.userBadge}>
        LOGADO COMO <strong>{displayName}</strong>
      </div>
      <button style={sharedStyles.secondaryButton} onClick={logout}>
        Encerrar Sessão
      </button>
    </div>
  );
};

export default WaitingView;
