import type { Participant } from '../../../types';

interface StudentListProps {
  participants: Participant[];
  selectedIds: string[];
  onlineUserIds: Set<string>;
  onlineNames: Set<string>;
  onToggle: (id: string) => void;
}

export default function StudentList({
  participants,
  selectedIds,
  onlineUserIds,
  onlineNames,
  onToggle,
}: StudentListProps) {
  return (
    <div className="flex flex-col gap-3">
      {participants.map((participant) => {
        const isSelected = selectedIds.includes(participant.conferenceRecordUserId);
        const isOnline = 
          onlineUserIds.has(participant.conferenceRecordUserId) || 
          (participant.name && onlineNames.has(participant.name));
        
        return (
          <div
            key={participant.conferenceRecordUserId}
            onClick={() => onToggle(participant.conferenceRecordUserId)}
            className={`flex items-center p-4 min-h-[70px] rounded-2xl cursor-pointer transition-all duration-300 border w-full group relative overflow-hidden
              ${isSelected
                ? 'bg-polyglan-brown text-polyglan-cream border-polyglan-brown shadow-lg shadow-polyglan-brown/20 scale-[1.02]'
                : 'bg-white border-polyglan-brown/10 hover:border-polyglan-brown/30 hover:bg-polyglan-brown/[0.02] dark:bg-polyglan-brown-dark dark:border-polyglan-cream/10'
              }`}
          >
            {/* Presence Indicator */}
            <div className="mr-4 relative">
              <div
                className={`w-3 h-3 rounded-full transition-colors duration-500 ${
                  isOnline ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              {isOnline && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping opacity-60" />
              )}
            </div>

            <div className="flex flex-col flex-grow">
              <div className="flex items-center justify-between">
                <span className="font-display font-black text-sm tracking-tight">
                  {participant.name}
                </span>
                {isOnline && (
                  <span className="text-[9px] font-black uppercase tracking-widest opacity-60">
                    Online
                  </span>
                )}
              </div>
              <div className={`text-[10px] font-bold opacity-40 truncate max-w-[180px] ${isSelected ? 'text-polyglan-cream' : ''}`}>
                {isOnline ? 'Extension Active' : 'Offline'}
              </div>
            </div>

            {/* Selection Checkbox Replacement */}
            <div className="ml-2 flex items-center justify-center">
              <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center
                ${isSelected 
                  ? 'bg-polyglan-cream border-polyglan-cream' 
                  : 'border-polyglan-brown/20 group-hover:border-polyglan-brown/40'
                }`}
              >
                {isSelected && (
                  <svg className="w-4 h-4 text-polyglan-brown" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
