import { apiFetch } from './api';
import type { SessionStartRequest, SessionStartResponse, Mode } from '../types';

/**
 * Start a session (Debate or History) with selected participants.
 */
export async function startSession(mode: Mode, participantIds: string[]): Promise<SessionStartResponse> {
  const modeType: SessionStartRequest['type'] = mode === 'debate' ? 'Debate' : 'History';


  return apiFetch<SessionStartResponse>('/session/start', {
    method: 'POST',
    body: JSON.stringify({
      type: modeType,
      participants: participantIds,
    } satisfies SessionStartRequest),
  });
}
