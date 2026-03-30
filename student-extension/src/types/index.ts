export type SupportedLang = 'en-US' | 'pt-BR';
export type SessionMode = 'DEBATE' | 'HISTORIA' | null;
export type SessionStatus = 'idle' | 'waiting' | 'recording' | 'paused' | 'ended';
export type SessionCommand = 'START' | 'PAUSE' | 'STOP' | 'SWITCH_SPEAKER';

export type WsMessage = {
  type: WsMessageType;
  sessionId: string;
  payload: unknown;
  timestamp: number;
};

export type WsMessageType =
  | 'TRANSCRIPTION_FRAGMENT'
  | 'SESSION_COMMAND'
  | 'MODE_CHANGED'
  | 'FEEDBACK'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT';

export type TranscriptionFragment = {
  type: 'TRANSCRIPTION_FRAGMENT';
  sessionId: string;
  studentId: string;
  payload: {
    text: string;
    isFinal: boolean;
    lang: SupportedLang;
    mode: SessionMode;
    modeSegmentId: string | null;
  };
  timestamp: number;
};

export type SessionCommandPayload = {
  command: SessionCommand;
  mode?: SessionMode;
  modeSegmentId?: string;
  targetStudentId?: string;
};

export type FeedbackPayload = {
  text: string;
  level: 'info' | 'warning' | 'success';
};

export type AuthState = {
  token: string | null;
  studentId: string | null;
  sessionId: string | null;
  lang: SupportedLang;
};
