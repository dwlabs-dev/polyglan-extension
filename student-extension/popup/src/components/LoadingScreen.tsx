import React from 'react';
import { Loader2 } from 'lucide-react';

interface LoadingScreenProps {
  message?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ message = 'Carregando...' }) => {
  return (
    <div className="flex-center flex-column" style={{ minHeight: '450px' }}>
      <Loader2 className="animate-spin" size={48} color="var(--amber)" />
      <p style={{ marginTop: '20px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.2em' }}>
        {message}
      </p>
    </div>
  );
};

export default LoadingScreen;
