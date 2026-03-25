import { google } from 'googleapis';
import { getAuthClient } from '../lib/google-auth.js';

export interface MeetParticipant {
  id: string;
  name: string;
  email: string;
  avatar: string;
}

/**
 * Mocked participants for local development / fallback.
 */
const MOCK_PARTICIPANTS: MeetParticipant[] = [
  { id: '1', name: 'Ana Silva', email: 'ana.silva@email.com', avatar: '👩‍🎓' },
  { id: '2', name: 'Carlos Oliveira', email: 'carlos.oliveira@email.com', avatar: '👨‍🎓' },
  { id: '3', name: 'Maria Santos', email: 'maria.santos@email.com', avatar: '👩‍💼' },
  { id: '4', name: 'Pedro Costa', email: 'pedro.costa@email.com', avatar: '👨‍💼' },
  { id: '5', name: 'Julia Pereira', email: 'julia.pereira@email.com', avatar: '👩‍🏫' },
  { id: '6', name: 'Lucas Ferreira', email: 'lucas.ferreira@email.com', avatar: '👨‍🏫' },
];

/**
 * List participants from a Google Meet conference record.
 * Falls back to mock data if no conferenceRecord is provided or API fails.
 *
 * @param conferenceRecord - The conference record name (e.g. "conferenceRecords/abc-mnop-xyz")
 */
export async function listParticipants(conferenceRecord?: string): Promise<MeetParticipant[]> {
  if (!conferenceRecord) {
    console.log('[MeetService] No conferenceRecord provided, returning mock participants.');
    return MOCK_PARTICIPANTS;
  }

  try {
    const authClient = await getAuthClient();
    const meetClient = google.meet({ version: 'v2', auth: authClient as any });

    const response = await (meetClient.conferenceRecords as any).participants.list({
      parent: `conferenceRecords/${conferenceRecord}`,
      headers: {
        'Authorization': `Bearer ${authClient.credentials.access_token}`,
      },
    });

    const participants: MeetParticipant[] = (response.data.participants || []).map(
      (p: any, index: number) => ({
        id: p.name || String(index + 1),
        name: p.signedinUser?.displayName || p.anonymousUser?.displayName || `Participant ${index + 1}`,
        email: p.signedinUser?.user || '',
        avatar: p.signedinUser?.displayName ? '👤' : '🔒',
      })
    );

    console.log(`[MeetService] Found ${participants.length} participants from Meet API.`);
    return participants;
  } catch (error) {
    console.error('[MeetService] Error fetching participants from Meet API:', error);
    console.log('[MeetService] Falling back to mock participants.');
    return MOCK_PARTICIPANTS;
  }
}

/**
 * Create a new Meet space.
 */
export async function createMeetSpace() {
  const authClient = await getAuthClient();
  const meetClient = google.meet({ version: 'v2', auth: authClient as any });

  const response = await (meetClient.spaces as any).create({
    headers: {
      'Authorization': `Bearer ${authClient.credentials.access_token}`,
    },
    requestBody: {},
  });

  return response.data;
}
