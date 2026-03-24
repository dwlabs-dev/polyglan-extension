import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

/**
 * POST /api/session/start
 * Body: { type: "Debate" | "History", participants: string[] }
 * Requires at least 2 participants.
 */
router.post('/api/session/start', (req: Request, res: Response) => {
  const { type, participants } = req.body;

  // Validate type
  const validTypes = ['Debate', 'History'];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({
      status: 'error',
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
    return;
  }

  // Validate participants
  if (!Array.isArray(participants) || participants.length < 2) {
    res.status(400).json({
      status: 'error',
      message: 'At least 2 participants are required.',
    });
    return;
  }

  console.log(`[API] Starting session — type: ${type}, participants: ${participants.join(', ')}`);

  res.json({
    status: 'success',
    type,
    participants,
    timestamp: Date.now(),
  });
});

export default router;
