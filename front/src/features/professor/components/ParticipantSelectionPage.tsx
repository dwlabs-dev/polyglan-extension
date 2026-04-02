import StudentList from './StudentList';
import type { Participant, Mode } from '../../../types';

interface ParticipantSelectionPageProps {
  participants: Participant[];
  loading: boolean;
  error: string | null;
  selectedIds: string[];
  onlineUserIds: Set<string>;
  onlineNames: Set<string>;
  toggleParticipant: (id: string) => void;
  startMode: (mode: Mode) => void;
}

export default function ParticipantSelectionPage({
  participants,
  loading,
  error,
  selectedIds,
  onlineUserIds,
  onlineNames,
  toggleParticipant,
  startMode
}: ParticipantSelectionPageProps) {
  return (
    <div className="flex flex-col flex-grow bg-polyglan-cream text-polyglan-brown dark:bg-polyglan-brown-dark dark:text-polyglan-cream overflow-hidden">
      <div className="flex-grow overflow-auto p-6 custom-scrollbar animate-fade-in-up">
        <header className="mb-8 pl-1">
          <div className="flex items-center gap-2 mb-2">
            <span className="w-8 h-[2px] bg-polyglan-primary"></span>
            <h2 className="text-[10px] font-display font-black uppercase tracking-[0.2em] text-polyglan-primary">
              Polyglan Add-on
            </h2>
          </div>
          <h1 className="text-3xl font-display font-black leading-tight text-polyglan-brown dark:text-polyglan-cream">
            Participantes <br />
            <span className="text-polyglan-primary">Ativos</span>
          </h1>
          <p className="text-xs text-polyglan-muted mt-2 font-medium">
            Selecione os alunos para as atividades síncronas.
          </p>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 gap-4">
            <div className="w-10 h-10 border-4 border-polyglan-primary/20 border-t-polyglan-primary animate-spin rounded-full"></div>
            <span className="text-[10px] font-black uppercase tracking-widest text-polyglan-muted">Sincronizando...</span>
          </div>
        ) : error ? (
          <div className="p-4 bg-polyglan-secondary/10 text-polyglan-secondary rounded-2xl text-xs border border-polyglan-secondary/20 font-bold">
            {error}
          </div>
        ) : (
          <div className="animate-fade-in-up stagger-1">
            <StudentList
              participants={participants}
              selectedIds={selectedIds}
              onlineUserIds={onlineUserIds}
              onlineNames={onlineNames}
              onToggle={toggleParticipant}
            />
          </div>
        )}
      </div>

      <footer className="p-6 bg-white/40 dark:bg-polyglan-brown/20 border-t border-polyglan-beige/30 backdrop-blur-md sticky bottom-0 z-10 animate-fade-in-up stagger-2">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => startMode('History')}
              disabled={loading || !!error || selectedIds.length === 0}
              className="btn-primary w-full shadow-lg shadow-polyglan-primary/20 disabled:shadow-none"
            >
              Iniciar História
            </button>
            <div className="text-[10px] text-center font-bold uppercase tracking-wider text-polyglan-muted opacity-70">
              {selectedIds.length === 0 ? 'Selecione pelo menos um aluno' : `${selectedIds.length} aluno(s) selecionado(s)`}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => startMode('Debate')}
              disabled={loading || !!error || selectedIds.length < 2}
              className="btn-secondary w-full"
            >
              Iniciar Debate
            </button>
            <div className="text-[9px] text-center font-bold uppercase tracking-wider text-polyglan-secondary opacity-80">
              {selectedIds.length < 2 && '(Selecione +1 para modo debate)'}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

