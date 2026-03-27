import { apiFetch } from './api';
import type { ParticipantsResponse } from '../types';

/**
 * Fetch participants from the API.
 */
export async function getParticipants(authHeader?: string): Promise<ParticipantsResponse> {
  const headers = authHeader ? { Authorization: authHeader } : undefined;
  return apiFetch<ParticipantsResponse>(`/participants`, { headers });
}

/**
 * Fetch participants from the API.
 */
export async function getLiveParticipants(authHeader?: string): Promise<ParticipantsResponse> {
  const headers = authHeader ? { Authorization: authHeader } : undefined;
  return apiFetch<ParticipantsResponse>(`/participants`, { headers });
}
