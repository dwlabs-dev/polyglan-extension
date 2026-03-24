import path from 'node:path';
import { authenticate } from '@google-cloud/local-auth';

const CREDENTIALS_PATH = path.join(process.cwd(), '../examples/credentials.json');

const SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly',
];

/**
 * Authenticate using local OAuth credentials.
 */
export async function getAuthClient() {
  return await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
}
