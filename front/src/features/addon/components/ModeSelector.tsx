import { useState } from 'react';
import type { Mode } from '../../types';

interface ModeSelectorProps {
  onSelectMode: (mode: Mode) => void;
}

const modes: { id: Mode; title: string; description: string; icon: string }[] = [
  {
    id: 'debate',
    title: 'Debate',
    description: 'Inicie um debate em tempo real com transcrição e análise de IA.',
    icon: '🎙️',
  },
  {
    id: 'history',
    title: 'History',
    description: 'Revise e analise sessões anteriores com os participantes.',
    icon: '📜',
  },
];

export default function ModeSelector({ onSelectMode }: ModeSelectorProps) {
  const [hoveredMode, setHoveredMode] = useState<Mode | null>(null);

  return (
    <div className="mode-selector">
      <h2 className="mode-selector__title">Escolha o Modo</h2>
      <p className="mode-selector__subtitle">Selecione como deseja iniciar a sessão.</p>

      <div className="mode-cards">
        {modes.map((mode) => (
          <button
            key={mode.id}
            className={`mode-card ${hoveredMode === mode.id ? 'mode-card--hover' : ''}`}
            onClick={() => onSelectMode(mode.id)}
            onMouseEnter={() => setHoveredMode(mode.id)}
            onMouseLeave={() => setHoveredMode(null)}
            id={`mode-card-${mode.id}`}
          >
            <span className="mode-card__icon">{mode.icon}</span>
            <span className="mode-card__title">{mode.title}</span>
            <span className="mode-card__desc">{mode.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
