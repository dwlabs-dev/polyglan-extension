import { useState, useEffect } from 'react';
import { getParticipants } from '../../../services/participants.service';
import type { Mode, Participant } from '../../../types';

interface ParticipantSelectorProps {
  mode: Mode;
  onStart: (mode: Mode, participantEmails: string[]) => void;
  onBack: () => void;
}

export default function ParticipantSelector({ mode, onStart, onBack }: ParticipantSelectorProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchParticipants = async () => {
      try {
        setLoading(true);
        const data = await getParticipants();
        if (data.status === 'success') {
          setParticipants(data.participants);
        } else {
          setError(data.message || 'Falha ao carregar participantes.');
        }
      } catch {
        setError('Erro de conexão com o servidor.');
      } finally {
        setLoading(false);
      }
    };

    fetchParticipants();
  }, []);

  const toggleParticipant = (email: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(email)) {
        next.delete(email);
      } else {
        next.add(email);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === participants.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(participants.map((p) => p.email)));
    }
  };

  const MIN_PARTICIPANTS = 2;

  const modeLabel = mode === 'debate' ? 'Debate' : 'History';

  return (
    <div className="participant-selector">
      <div className="participant-selector__header">
        <button className="back-button" onClick={onBack} id="back-button">
          ← Voltar
        </button>
        <h2 className="participant-selector__title">
          {modeLabel} — Participantes
        </h2>
        <p className="participant-selector__subtitle">
          Selecione pelo menos {MIN_PARTICIPANTS} participantes para a sessão.
        </p>
      </div>

      {loading && (
        <div className="participant-loading">
          <div className="spinner"></div>
          <span>Carregando participantes...</span>
        </div>
      )}

      {error && <div className="participant-error">{error}</div>}

      {!loading && !error && (
        <>
          <button
            className="select-all-button"
            onClick={selectAll}
            id="select-all-button"
          >
            {selected.size === participants.length ? 'Desmarcar todos' : 'Selecionar todos'}
          </button>

          <ul className="participant-list">
            {participants.map((p) => (
              <li
                key={p.id}
                className={`participant-item ${selected.has(p.email) ? 'participant-item--selected' : ''}`}
                onClick={() => toggleParticipant(p.email)}
                id={`participant-${p.id}`}
              >
                <span className="participant-item__avatar">{p.avatar}</span>
                <div className="participant-item__info">
                  <span className="participant-item__name">{p.name}</span>
                  <span className="participant-item__email">{p.email}</span>
                </div>
                <div className={`participant-item__check ${selected.has(p.email) ? 'checked' : ''}`}>
                  {selected.has(p.email) ? '✓' : ''}
                </div>
              </li>
            ))}
          </ul>

          {selected.size > 0 && selected.size < MIN_PARTICIPANTS && (
            <div className="participant-warning">
              Selecione pelo menos {MIN_PARTICIPANTS} participantes.
            </div>
          )}

          <button
            className="start-session-button"
            disabled={selected.size < MIN_PARTICIPANTS}
            onClick={() => onStart(mode, Array.from(selected))}
            id="start-session-button"
          >
            Iniciar {modeLabel} ({selected.size} selecionado{selected.size !== 1 ? 's' : ''})
          </button>
        </>
      )}
    </div>
  );
}
