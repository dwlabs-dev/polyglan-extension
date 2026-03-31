import StudentList from '../../professor/components/StudentList';
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
    <div className="flex flex-col flex-grow bg-polyglan-cream text-polyglan-brown dark:bg-polyglan-brown-dark dark:text-polyglan-cream">
      <div className="flex-grow overflow-auto p-4 custom-scrollbar">
        <header className="mb-6 px-2">
          <h2 className="text-sm font-display font-black uppercase tracking-widest opacity-80 mb-1">
            Polyglan
          </h2>
          <h1 className="text-2xl font-display font-black leading-tight">
            Participantes Ativos
          </h1>
        </header>

        {loading ? (
          <div className="flex items-center justify-center p-12">
            <div className="w-8 h-8 border-4 border-polyglan-brown/20 border-t-polyglan-brown animate-spin rounded-full"></div>
          </div>
        ) : error ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm border border-red-100">
            {error}
          </div>
        ) : (
          <StudentList
            participants={participants}
            selectedIds={selectedIds}
            onlineUserIds={onlineUserIds}
            onlineNames={onlineNames}
            onToggle={toggleParticipant}
          />
        )}
      </div>

      <footer className="p-6 bg-polyglan-brown/5 border-t border-polyglan-brown/10 backdrop-blur-sm sticky bottom-0">
        <div className="flex flex-col gap-3">
          <button
            onClick={() => startMode('History')}
            disabled={loading || !!error || selectedIds.length === 0}
            className="w-full py-4 bg-polyglan-brown text-polyglan-cream dark:bg-polyglan-cream dark:text-polyglan-brown rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale disabled:scale-100 shadow-lg shadow-polyglan-brown/20"
          >
            Iniciar História
          </button>
          <div className="text-[10px] text-center font-bold uppercase tracking-tighter opacity-50">
            {selectedIds.length} selecionado(s) para a atividade
          </div>
          <button
            onClick={() => startMode('Debate')}
            disabled={loading || !!error || selectedIds.length < 2}
            className="w-full py-4 border-2 border-polyglan-brown dark:border-polyglan-cream bg-transparent text-polyglan-brown dark:text-polyglan-cream rounded-2xl font-display font-black uppercase tracking-widest text-xs hover:bg-polyglan-brown/5 active:scale-95 transition-all disabled:opacity-40 disabled:scale-100"
          >
            Iniciar Debate
          </button>
          <div className="text-[9px] text-center font-bold uppercase tracking-tighter opacity-40">
            (Selecione +1 para modo debate)
          </div>
        </div>
      </footer>
    </div>
  );
}
