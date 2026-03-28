import { google } from 'googleapis';
import { meet_v2 } from 'googleapis/build/src/apis/meet/v2';
import { getAuthClient } from '../lib/google-auth.js';
import { getAccessToken } from '../lib/context.js';

export interface MeetParticipant {
  name: string;
  googleUserId: string;
  conferenceRecordUserId: string;
}

export async function getLiveMeet(accessToken: string): Promise<meet_v2.Meet> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  const meetClient = google.meet({
    version: 'v2',
    auth: auth
  });

  return meetClient;
}

/**
 * List participants from a Google Meet conference record.
 * Falls back to mock data if no meetingCode is provided or API fails.
 *
 * @param meetingCode - The conference record name (e.g. "meetCode/abc-mnop-xyz")
 */
export async function listParticipants(): Promise<MeetParticipant[]> {
  try {
    const accessToken = getAccessToken() as string;
    const meetClient = await getLiveMeet(accessToken);
    const conferenceRecord = await getCurrentConferenceRecord(accessToken);

    const response = await (meetClient.conferenceRecords as any).participants.list({
      parent: conferenceRecord.name
    });

    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });
    const oauth2 = google.oauth2({ version: 'v2', auth });

    let myUserResourceName = '';
    try {
      const { data } = await oauth2.userinfo.get();
      myUserResourceName = data.id ? `users/${data.id}` : '';
    } catch (e) {
      console.warn('[MeetService] Could not fetch userinfo for exclusion.');
    }

    const rawParticipants = response.data.participants || [];
    const participants: MeetParticipant[] = rawParticipants
      .filter((p: any) => {
        if (!myUserResourceName) return true;
        // The participant's signedinUser.user ID looks like 'users/1234...'
        return p.signedinUser?.user !== myUserResourceName;
      })
      .map(
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

export async function getCurrentConferenceRecord(accessToken: string) {
  const meetClient = await getLiveMeet(accessToken);

  const response = await (meetClient.conferenceRecords as any).list({
    filter: `end_time IS NULL`
  })

  return response.data.conferenceRecords[0];
}
