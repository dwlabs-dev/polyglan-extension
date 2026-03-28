import { Router } from 'express';
import type { Request, Response } from 'express';
import { getAuthClient } from '@lib/google-auth.js';
const router = Router();

/**
 * POST /api/auth
 * Returns the authentication status.
 */
router.post('/api/auth', async (req: Request, res: Response) => {
    try {
        const authClient = await getAuthClient();
        const isAuthenticated = authClient.credentials.access_token !== undefined;
        console.log(`[API] Authentication status: ${isAuthenticated}`);

        res.json({ status: 'success', "credentials": authClient.credentials });
    } catch (error: any) {
        console.error('[API] Error listing participants:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

export default router;
