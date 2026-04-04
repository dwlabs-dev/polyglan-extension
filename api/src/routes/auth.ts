import { Router } from 'express';
import type { Request, Response } from 'express';
import { google } from 'googleapis';
import { getAuthClient, getStudentUserInfo } from '../lib/google-auth.js';
import { getLoggedUser, getCurrentSpace } from '@services/meet.service.js';

const router = Router();

/**
 * POST /api/auth
 * Returns the authentication status.
 */
router.post('/api/auth', async (req: Request, res: Response) => {
  try {
    console.log('[API] Identifying user via meetToken...');

    const oauth2Client = await getAuthClient();

    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: oauth2Client.credentials.access_token });
      const oauth2 = google.oauth2({ version: 'v2', auth });
      const { data } = await oauth2.userinfo.get();

      const userId = data.id;
      console.log(`[API] Identified user ${userId} via meetToken`);

      const currentSpace = await getCurrentSpace(oauth2Client.credentials.access_token as string);

      return res.json({
        status: 'success',
        userId,
        meetingId: (currentSpace.meetingCode as string).replace(/-/g, '').toLowerCase().trim(),
        authenticated: true,
        credentials: oauth2Client.credentials
      });
    } catch (e) {
      console.warn('[MeetService] Could not fetch userinfo for exclusion.', e);
      throw e;
    }


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

    const studentData = await getStudentUserInfo(authCode, redirectUri);

    res.json({
      status: 'success',
      lang: 'pt-BR',
      ...studentData
    });
  } catch (error: any) {
    console.error('[AuthRoute] Error authenticating student:', error);
    res.status(500).json({
      status: 'error',
      message: 'Internal server error during student authentication',
    });
  }
});

export default router;
