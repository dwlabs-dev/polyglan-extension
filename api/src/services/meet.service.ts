import { google } from 'googleapis';
import { getAuthClient } from '../lib/google-auth.js';

export interface MeetParticipant {
  name: string;
  googleUserId: string;
  conferenceRecordUserId: string;
}

/**
 * List participants from a Google Meet conference record.
 * Falls back to mock data if no meetingCode is provided or API fails.
 *
 * @param meetingCode - The conference record name (e.g. "meetCode/abc-mnop-xyz")
 */
export async function listParticipants(meetingCode?: string): Promise<MeetParticipant[]> {
  if (!meetingCode) {
    console.log('[MeetService] No conferenceRecord provided');
    return [];
  }

  try {
    const authClient = await getAuthClient();
    const meetClient = google.meet({ version: 'v2', auth: authClient as any });

    const conferenceRecord = await getCurrentConferenceRecord(meetingCode);

    const response = await (meetClient.conferenceRecords as any).participants.list({
      parent: conferenceRecord.name,
      headers: {
        'Authorization': `Bearer ${authClient.credentials.access_token}`,
      },
    });

    const participants: MeetParticipant[] = (response.data.participants || []).map(
      (p: any, index: number) => ({
        googleUserId: p.signedinUser?.user || '',
        conferenceRecordUserId: p.name || String(index + 1),
        name: p.signedinUser?.displayName || p.anonymousUser?.displayName || `Participant ${index + 1}`
      })
    );

    console.log(`[MeetService] Found ${participants.length} participants from Meet API.`);
    return participants;
  } catch (error) {
    console.error('[MeetService] Error fetching participants from Meet API:', error);
    return [];
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

export async function getCurrentConferenceRecord(meetingCode: string) {
  const authClient = await getAuthClient();
  const meetClient = google.meet({ version: 'v2', auth: authClient as any });

  const response = await (meetClient.conferenceRecords as any).list({
    filter: `space.meeting_code="${meetingCode}" AND end_time IS NULL`,
    headers: {
      'Authorization': `Bearer ${authClient.credentials.access_token}`,
    },
  })

  return response.data.conferenceRecords[0];
}
