import { Router } from 'express';
import type { Request, Response } from 'express';
import { listParticipants } from '@services/meet.service.js';
import { ensureAuthenticated } from '@middlewares/auth.middleware.js';

const router = Router();

/**
 * GET /api/participants?conferenceRecord=<name>
 * Lists participants from a Google Meet conference record.
 * Falls back to mock data if no conferenceRecord is provided.
 */
router.get('/api/participants', ensureAuthenticated, async (_req: Request, res: Response) => {
  try {
    const participants = await listParticipants();

    res.json({ status: 'success', participants });
  } catch (error: any) {
    console.error('[API] Error listing participants:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
