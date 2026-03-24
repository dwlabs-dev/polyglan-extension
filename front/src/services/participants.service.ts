import { apiFetch } from './api';
import type { ParticipantsResponse } from '../types';

/**
 * Fetch participants from the API.
 * @param conferenceRecord - Optional conference record name for real Meet API calls.
 */
export async function getParticipants(conferenceRecord?: string): Promise<ParticipantsResponse> {
  const query = conferenceRecord ? `?conferenceRecord=${encodeURIComponent(conferenceRecord)}` : '';
  return apiFetch<ParticipantsResponse>(`/participants${query}`);
}
