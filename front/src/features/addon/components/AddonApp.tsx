import '@assets/addon.css';
import { useState, useEffect } from 'react';
import { getMeetSession } from '@lib/meet';
import { startSession } from '@services/session.service';

interface CoActivityState {
  debateStarted: boolean;
  meetingId: string | null;
}

function App() {
  const [status, setStatus] = useState('');
  const [isDebateActive, setIsDebateActive] = useState(false);

  useEffect(() => {
    const startCoActivityListener = async () => {
      try {
        const session = await getMeetSession();

        await session.createCoActivityClient({
          onCoActivityStateChanged: (state: CoActivityState) => {
            console.log('[Add-on] Co-activity state changed:', state);
            if (state.debateStarted) {
              setIsDebateActive(true);
              setStatus(`Modo Debate ATIVO`);
            } else {
              setIsDebateActive(false);
              setStatus('Pronto para iniciar');
            }
          },
        });
      } catch (e) {
        console.warn('[Add-on] Co-activity não disponível (fora do Meet?)');
      }
    };

    startCoActivityListener();
  }, []);

  const handleStartDebate = async () => {

    setStatus('Iniciando sincronização...');

    try {
      // 1. Notificar o backend unificado
      console.log(`[AddonApp] Starting backend session for debate...`);
      // For now, passing empty participants as selection isn't in this screen,
      // or we'd ideally pass the current participant list.
      await startSession('debate', []);

      // 2. Sincronizar via SDK para todos os participantes
      const session = await getMeetSession();
      await session.createCoActivityClient({});

      setStatus('Sincronização enviada para todos!');
      setIsDebateActive(true);

    } catch (error) {
      console.error('Co-activity error:', error);
      setStatus('Erro ao sincronizar debate.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-polyglan-cream dark:bg-polyglan-brown-dark text-polyglan-brown dark:text-polyglan-cream px-4 py-6 font-sans antialiased">
      <div className="flex flex-col h-full bg-white dark:bg-polyglan-brown rounded-2xl shadow-sm border border-polyglan-beige dark:border-polyglan-brown-dark overflow-hidden p-6 transition-colors">
        <header className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Polyglan Logo" className="w-16 h-16 mb-4" />
          <h1 className="text-xl font-display font-black uppercase tracking-tight">Polyglan</h1>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center text-center">
          <p className="text-sm font-medium mb-8 text-polyglan-muted dark:text-polyglan-beige-light leading-relaxed">
            {isDebateActive
              ? 'O modo debate está ativo para todos os participantes.'
              : 'Inicie uma atividade sincronizada para todos na reunião.'}
          </p>

          <button
            className="w-full py-4 rounded-full bg-polyglan-primary text-polyglan-brown-dark font-display font-bold text-[11px] uppercase tracking-[0.15em] transition-transform hover:bg-polyglan-primary/90 active:scale-[0.98] cursor-pointer"
            onClick={handleStartDebate}
          >
            {'Iniciar Debate'}
          </button>

          {status && (
            <div className="mt-6 text-xs font-bold uppercase tracking-widest text-polyglan-secondary animate-pulse">
              {status}
            </div>
          )}
        </main>

        <footer className="mt-8 text-center text-[9px] uppercase tracking-widest font-bold text-polyglan-muted dark:text-polyglan-beige-light opacity-50">
          <span>v1.0.0 (Meet SDK)</span>
        </footer>
      </div>
    </div>
  );
}

export default App;
