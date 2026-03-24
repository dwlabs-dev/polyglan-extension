export type Mode = 'debate' | 'history';

export interface Participant {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

export interface SessionStartRequest {
  type: 'Debate' | 'History';
  participants: string[];
}

export interface SessionStartResponse {
  status: 'success' | 'error';
  message?: string;
  type?: string;
  participants?: string[];
  timestamp?: number;
}

export interface ParticipantsResponse {
  status: 'success' | 'error';
  participants: Participant[];
  message?: string;
}
