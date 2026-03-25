import path from 'node:path';
import { authenticate } from '@google-cloud/local-auth';
import type { OAuth2Client } from 'google-auth-library';
import { LRUCache } from 'lru-cache';

const CREDENTIALS_PATH = path.join(process.cwd(), '/infra/google/credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
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
