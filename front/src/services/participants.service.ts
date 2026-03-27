import { apiFetch } from './api';
import type { ParticipantsResponse } from '../types';

/**
 * Fetch participants from the API.
 */
export async function getParticipants(): Promise<ParticipantsResponse> {
  return apiFetch<ParticipantsResponse>(`/participants`);
}
/**
 * Fetch participants from the API.
 */
export async function getLiveParticipants(): Promise<ParticipantsResponse> {
  return apiFetch<ParticipantsResponse>(`/participants`);
}
