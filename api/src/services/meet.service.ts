import { google } from 'googleapis';
import { meet_v2 } from 'googleapis/build/src/apis/meet/v2';
import { oauth2_v2 } from 'googleapis/build/src/apis/oauth2/v2';
import { getAuthClient } from '@lib/google-auth.js';
import { getAccessToken } from '@lib/context.js';
import { LRUCache } from 'lru-cache';

const userInfoCache = new LRUCache<string, oauth2_v2.Schema$Userinfo>({
  max: 100,
  ttl: 1000 * 60 * 60, // 1 hour cache
});

export interface MeetParticipant {
  name: string;
  googleUserId: string;
  conferenceRecordUserId: string;
}

export async function getLoggedUser(): Promise<oauth2_v2.Schema$Userinfo> {
  const accessToken = getAccessToken() as string;

  const user = userInfoCache.get(accessToken);
  if (user) return user;

  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const oauth2 = google.oauth2({ version: 'v2', auth });

  try {
    const { data } = await oauth2.userinfo.get();
    userInfoCache.set(accessToken, data);
    return data;
  } catch (e) {
    console.warn('[MeetService] Could not fetch userinfo for exclusion.', e);
    throw e;
  }
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

    const data = await getLoggedUser();

    const rawParticipants = response.data.participants || [];
    const participants: MeetParticipant[] = rawParticipants
      .filter((p: any) => {
        if (!data.id) return true;
        // Normalize the participant and compared user ID
        const participantId = (p.signedinUser?.user || '').replace('users/', '');
        return participantId !== data.id;
      })
      .map(
        (p: any, index: number) => ({
          googleUserId: (p.signedinUser?.user || '').replace('users/', ''),
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

/**
 * Initialize the Google Meet Media API (Audio Readonly).
 * Mocks the WebRTC handshake and stream setup.
 */
export async function initializeMediaStream(conferenceRecordName: string) {
  const accessToken = getAccessToken() as string;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  console.log(`[MeetService] Initializing Audio Readonly stream for ${conferenceRecordName}...`);
  console.log(`[MeetService] Using scope: https://www.googleapis.com/auth/meetings.conference.media.audio.readonly`);

  // Simulate WebRTC/SDP negotiation with the Meet Media API
  await new Promise(resolve => setTimeout(resolve, 500));

  console.log(`[MeetService] Stream connected. Listening to audio flows...`);

  // In a real scenario, this would begin consuming the RTP stream.
  return { status: 'streaming', conferenceRecordName };
}

/**
 * Send a message to the Google Meet chat.
 * Note: Uses the Google Chat API as proxy since Meet REST API is read-only for chats.
 */
export async function sendMeetingChatMessage(conferenceRecordName: string, text: string) {
  const accessToken = getAccessToken() as string;
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });

  console.log(`[MeetService] Posting to meeting chat [${conferenceRecordName}]: ${text}`);

  // In a real scenario, this would call spaces.messages.create via the Chat API
  // targeting the space linked to this conference record.
  return { status: 'sent', text };
}
