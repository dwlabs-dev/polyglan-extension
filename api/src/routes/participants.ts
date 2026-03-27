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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ status: 'error', message: 'Token de Autenticação não fornecido' });
    }

    const accessToken = authHeader.split(' ')[1];
    const participants = await listParticipants(accessToken);

    res.json({ status: 'success', participants });
  } catch (error: any) {
    console.error('[API] Error listing participants:', error);
    res.status(500).json({ status: 'error', message: error.message });
  }
});

export default router;
