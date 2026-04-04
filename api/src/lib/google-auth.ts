import path from 'node:path';
import { authenticate } from '@google-cloud/local-auth';
import { google } from 'googleapis';
import type { OAuth2Client } from 'google-auth-library';
import { LRUCache } from 'lru-cache';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CREDENTIALS_PATH = path.join(process.cwd(), '/infra/google/credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
  'https://www.googleapis.com/auth/admin.directory.user.readonly',
  'https://www.googleapis.com/auth/meetings.conference.media.audio.readonly'
];

// Initialize cache with a max of 1 item (the auth client)
const cache = new LRUCache<string, OAuth2Client>({
  max: 10,
  ttl: 1000 * 60 * 60, // 1 hour TTL (optional, client handles refresh)
});

const AUTH_CLIENT_KEY = 'google_auth_client';

/**
 * Authenticate using local OAuth credentials.
 * Reuses the client stored in memory.
 */
export async function getAuthClient(): Promise<OAuth2Client> {
  let cachedClient = cache.get(AUTH_CLIENT_KEY);

  if (cachedClient) {
    return cachedClient;
  }

  console.log('[GoogleAuth] No cached client found in memory. Authenticating...');

  const client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  cachedClient = client as unknown as OAuth2Client;
  cache.set(AUTH_CLIENT_KEY, cachedClient);

  console.log('[GoogleAuth] Authenticated and cached client in memory.');

  return cachedClient;
}

async function getAuthClientForStudent(authCode: string, redirectUri: string): Promise<OAuth2Client> {

  let cachedClient = cache.get(authCode);

  if (cachedClient) {
    return cachedClient;
  }

  const creds = getGoogleCredentials('../../../student-extension/infra/google/credentials.json');

  const oauth2Client = new google.auth.OAuth2(
    creds.client_id,
    creds.client_secret,
    redirectUri
  );

  const { tokens } = await oauth2Client.getToken(authCode);
  oauth2Client.setCredentials(tokens);

  cache.set(authCode, oauth2Client);

  console.log('[GoogleAuth] Authenticated and cached client in memory.');

  return oauth2Client;
}

export async function getStudentUserInfo(authCode: string, redirectUri: string): Promise<any> {
  try {
    const oauth2Client = await getAuthClientForStudent(authCode, redirectUri);

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    const userInfo = await oauth2.userinfo.get();
    const email = userInfo.data.email || '';
    const googleUserId = userInfo.data.id || '';
    const name = userInfo.data.name || email.split('@')[0];

    return {
      email,
      name,
      googleUserId,
    };
  } catch (error: any) {
    console.error('[GoogleAuth] Error getting student user info:', error);
    throw error;
  }
}

/**
 * Load Google OAuth credentials from backend's credentials.json
 * 
 * Location: /api/infra/google/credentials.json
 * Type: 'installed' (OAuth2 for server-side token exchange)
 */
interface GoogleCredentials {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
}

function getGoogleCredentials(relativePath: string = '../../infra/google/credentials.json'): GoogleCredentials {
  // Resolve the path relative to this file's directory
  const credPath = path.resolve(__dirname, relativePath);

  const credFile = readFileSync(credPath, 'utf-8');
  const cred = JSON.parse(credFile);

  // Supports both 'installed' (desktop/backend) and 'web' (client/extension) credentials
  const creds = cred.installed || cred.web;

  if (!creds) {
    throw new Error(`Invalid credentials.json format at ${credPath}. Expected 'installed' or 'web' key.`);
  }

  return creds;
}