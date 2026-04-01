import { Router } from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import path from 'path';
import { google } from 'googleapis';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { getAuthClient } from '../lib/google-auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const router = Router();

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

/**
 * POST /api/auth
 * Returns the authentication status.
 */
router.post('/api/auth', async (req: Request, res: Response) => {
  try {
    const { meetToken } = req.body;

    console.log('[API] Identifying user via meetToken...');

    const oauth2Client = await getAuthClient();
    oauth2Client.setCredentials({ access_token: oauth2Client.credentials.access_token });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

    const userInfo = await oauth2.userinfo.get();

    const userId = userInfo.data.id || '';

    console.log(`[API] Identified user ${userId} via meetToken`);

    // Also check if the backend itself is authenticated for service-level tasks
    const authClient = await getAuthClient();
    const isBackendAuthenticated = authClient.credentials.access_token !== undefined;

    res.json({
      status: 'success',
      userId,
      authenticated: true,
      isBackendAuthenticated,
      credentials: authClient.credentials
    });
  } catch (error: any) {
    console.error('[API] Error checking auth status:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

/**
 * POST /api/auth/student
 * Exchanges Google authorization code for a session token
 * 
 * Body: { authCode: string, redirectUri: string }
 * 
 * Returns:
 * {
 *   status: 'success',
 *   sessionId: string (UUID),
 *   token: string (temporary session token),
 *   email: string (user email),
 *   lang: 'pt-BR' (default)
 * }
 * 
 * Errors:
 * - 400: authCode not provided
 * - 401: Invalid authorization code
 * - 500: Server error
 */
router.post('/api/auth/student', async (req: Request, res: Response) => {
  try {
    const { authCode, redirectUri } = req.body;

    if (!authCode || typeof authCode !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'authCode is required',
      });
      return;
    }

    // Load Google credentials from student-extension's credentials.json
    const creds = getGoogleCredentials('../../../student-extension/infra/google/credentials.json');

    // Create OAuth2 client for token exchange
    const oauth2Client = new google.auth.OAuth2(
      creds.client_id,
      creds.client_secret,
      redirectUri || 'https://polyglan.local/'
    );

    try {
      // Exchange authorization code for tokens
      const { tokens } = await oauth2Client.getToken(authCode);

      if (!tokens.access_token) {
        res.status(401).json({
          status: 'error',
          message: 'Failed to obtain access token',
        });
        return;
      }

      // Get user info using the access token
      oauth2Client.setCredentials(tokens);
      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });

      const userInfo = await oauth2.userinfo.get();
      const email = userInfo.data.email || '';
      const name = userInfo.data.name || email.split('@')[0];
      const googleUserId = userInfo.data.id || ''; // sub do Google (ID numérico)

      // Generate session credentials for the extension
      const sessionId = randomUUID();
      const sessionToken = randomUUID();
      const lang = 'pt-BR';

      console.log(`[AuthRoute] Student extension authenticated: ${email}, sessionId: ${sessionId}, googleUserId: ${googleUserId}`);

      res.json({
        status: 'success',
        sessionId,
        token: sessionToken,
        googleUserId,
        email,
        name,
        lang,
      });
    } catch (error: any) {
      console.error('[AuthRoute] Error exchanging auth code:', error);
      res.status(401).json({
        status: 'error',
        message: 'Invalid authorization code or token exchange failed',
      });
    }
  } catch (error: any) {
    console.error('[AuthRoute] Error authenticating student:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during student authentication',
    });
  }
});

export default router;
