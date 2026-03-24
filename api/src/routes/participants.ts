import { Router } from 'express';
import type { Request, Response } from 'express';
import { listParticipants } from '../services/meet.service.js';

const router = Router();

/**
 * GET /api/participants?conferenceRecord=<name>
 * Lists participants from a Google Meet conference record.
 * Falls back to mock data if no conferenceRecord is provided.
 */
router.get('/api/participants', async (req: Request, res: Response) => {
  try {
    const conferenceRecord = req.query.conferenceRecord as string | undefined;
    console.log(`[API] Listing participants (conferenceRecord: ${conferenceRecord || 'none — using mock'})...`);

    const participants = await listParticipants(conferenceRecord);

    res.json({ status: 'success', participants });
  } catch (error: any) {
    console.error('[API] Error listing participants:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
