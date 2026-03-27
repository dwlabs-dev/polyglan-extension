import { Router } from 'express';
import type { Request, Response } from 'express';
import { createMeetSpace } from '../services/meet.service.js';
import { ensureAuthenticated } from '../middlewares/auth.middleware.js';

const router = Router();

/**
 * POST /api/meet/create-space
 * Creates a new Google Meet space.
 */
router.post('/api/meet/create-space', ensureAuthenticated, async (_req: Request, res: Response) => {
  try {
    console.log('[API] Creating Meet space...');
    const space = await createMeetSpace();

    res.json({
      status: 'success',
      meetingName: space.name,
      meetingCode: space.meetingCode,
      meetingUri: space.meetingUri,
      space,
    });
  } catch (error: any) {
    console.error('[API] Error creating Meet space:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
