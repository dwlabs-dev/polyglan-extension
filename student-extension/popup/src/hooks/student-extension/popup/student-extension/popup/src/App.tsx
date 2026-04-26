import React from 'react';
import { useSession } from './hooks/useSession';
import LoadingScreen from './components/LoadingScreen';
import Header from './components/Header';
import IdleView from './components/views/IdleView';
import WaitingView from './components/views/WaitingView';
import RecordingView from './components/views/RecordingView';
import PausedView from './components/views/PausedView';
import EndedView from './components/views/EndedView';
import { sharedStyles } from './components/AppStyles';

const App: React.FC = () => {
  const {
    state,
    micGranted,
    login,
    logout,
    isLoading,
    unlockAudio
  } = useSession();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!state) return null;

  const isRecording = state.status === 'recording' && micGranted;

  const containerStyle = {
    ...sharedStyles.container,
    border: isRecording ? '2px solid var(--accent-red)' : '2px solid transparent',
    boxShadow: isRecording ? '0 0 15px rgba(239, 68, 68, 0.2)' : 'none',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={containerStyle}>
      {state.status !== 'idle' && (
        <Header
          micGranted={micGranted}
          isRecording={isRecording}
          onUnlockAudio={unlockAudio}
        />
      )}

      {state.status === 'idle' && (
        <IdleView onLogin={login} />
      )}

      {state.status === 'waiting' && (
        <WaitingView
          userName={state.userName}
          googleEmail={state.googleEmail}
          micGranted={micGranted}
          onLogout={logout}
        />
      )}

      {state.status === 'recording' && (
        <RecordingView
          mode={state.mode}
          isHistory={state.mode === 'HISTORIA'}
          micGranted={micGranted}
          interimTranscript={state.interimTranscript}
        />
      )}

      {state.status === 'paused' && (
        <PausedView />
      )}

      {state.status === 'ended' && (
        <EndedView onRestart={() => window.location.reload()} />
      )}
    </div>
  );
};

export default App;
