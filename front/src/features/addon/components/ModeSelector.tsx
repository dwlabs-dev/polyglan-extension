import { useModeSelector } from '../hooks/useModeSelector';
import ParticipantSelectionPage from './ParticipantSelectionPage';
import ActiveSessionPage from './ActiveSessionPage';

export default function ModeSelector() {
  const {
    step,
    selectedIds,
    activeMode,
    seconds,
    isPaused,
    setIsPaused,
    toggleParticipant,
    startMode,
    reset,
    formatTime,
    participants,
    loading,
    error
  } = useModeSelector();

  const selectedParticipants = participants.filter((u) => selectedIds.includes(u.conferenceRecordUserId));

  return (
    <div className="flex flex-col h-screen bg-polyglan-cream text-polyglan-brown font-sans antialiased overflow-hidden dark:bg-polyglan-brown-dark dark:text-polyglan-cream">
      {step === 'selection' ? (
        <ParticipantSelectionPage
          participants={participants}
          loading={loading}
          error={error}
          selectedIds={selectedIds}
          toggleParticipant={toggleParticipant}
          startMode={startMode}
        />
      ) : (
        <ActiveSessionPage
          activeMode={activeMode || ''}
          seconds={seconds}
          isPaused={isPaused}
          setIsPaused={setIsPaused}
          reset={reset}
          formatTime={formatTime}
          selectedParticipants={selectedParticipants}
        />
      )}
    </div>
  );
}
