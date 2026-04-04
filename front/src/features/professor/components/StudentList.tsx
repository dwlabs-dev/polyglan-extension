import type { Participant } from '../../../types';

interface StudentListProps {
  participants: Participant[];
  selectedIds: string[];
  onlineUserIds: Set<string>;
  onlineNames: Set<string>;
  sessionId?: string;
  onToggle: (id: string) => void;
}

export default function StudentList({
  participants,
  selectedIds,
  onlineUserIds,
  onlineNames,
  sessionId,
  onToggle,
}: StudentListProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="mb-2 text-xs font-mono text-polyglan-primary bg-polyglan-primary/10 p-2 rounded break-all">
        DEBUG Room: [{sessionId || 'EMPTY'}] | Parts: ({participants.length}) | Online: ({onlineUserIds.size})
        <br />
        User IDs received: {Array.from(onlineUserIds).join(', ') || 'none'}
        <br />
        Participant API IDs: {participants.map(p => p.googleUserId).join(', ') || 'none'}
      </div>
      {participants.map((participant, index) => {
        const isSelected = selectedIds.includes(participant.conferenceRecordUserId);

        const isOnline =
          onlineUserIds.has(participant.conferenceRecordUserId) ||
          (participant.googleUserId && onlineUserIds.has(participant.googleUserId)) ||
          (participant.name && onlineNames.has(participant.name));

        return (
          <button
            key={participant.conferenceRecordUserId}
            onClick={() => onToggle(participant.conferenceRecordUserId)}
            className={`group relative flex items-center p-4 rounded-3xl border-2 transition-all duration-300 text-left w-full overflow-hidden animate-fade-in-up
              ${isSelected
                ? 'bg-white border-polyglan-primary shadow-xl shadow-polyglan-primary/15 scale-[1.02]'
                : 'bg-white/60 border-polyglan-beige-light hover:border-polyglan-beige hover:bg-white hover:shadow-md'
              }`}
            style={{ animationDelay: `${(index + 2) * 100}ms` }}
          >
            {/* Background Decoration for selected state */}
            {isSelected && (
              <div className="absolute top-0 right-0 w-16 h-16 bg-polyglan-primary/10 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            )}

            {/* Presence Indicator Container */}
            <div className="mr-5 relative flex-shrink-0">
              <div className="w-12 h-12 bg-polyglan-beige-light/30 rounded-2xl flex items-center justify-center border border-polyglan-beige/20 group-hover:bg-polyglan-beige-light/50 transition-colors">
                <span className="font-display font-black text-polyglan-brown/40 group-hover:text-polyglan-brown/60 text-lg">
                  {participant.name?.charAt(0) || '?'}
                </span>
              </div>

              {/* Online status dot */}
              <div
                className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center transition-all ${isOnline ? 'bg-polyglan-secondary' : 'bg-gray-300'
                  }`}
              >
                {isOnline && (
                  <div className="absolute inset-0 rounded-full bg-polyglan-secondary animate-pulse-soft opacity-60"></div>
                )}
              </div>
            </div>

            <div className="flex flex-col flex-grow min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-polyglan-brown text-base tracking-tight truncate">
                  {participant.name}
                </span>
                {isOnline && (
                  <span className="text-[8px] font-black uppercase tracking-widest bg-polyglan-secondary/10 text-polyglan-secondary px-1.5 py-0.5 rounded-md">
                    Live
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] font-bold uppercase tracking-wider ${isOnline ? 'text-polyglan-secondary' : 'text-polyglan-muted'}`}>
                  {isOnline ? 'Extension Connected' : 'Waiting Connection'}
                </span>
              </div>
            </div>

            {/* Selection Checkmark */}
            <div className={`ml-4 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0
              ${isSelected
                ? 'bg-polyglan-primary border-polyglan-primary rotate-0 scale-100'
                : 'border-polyglan-beige/40 rotate-12 scale-90 opacity-20'
              }`}
            >
              <svg
                className={`w-4 h-4 text-polyglan-brown transition-transform duration-300 ${isSelected ? 'scale-100' : 'scale-0'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}

