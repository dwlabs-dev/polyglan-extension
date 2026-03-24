import { Router } from 'express';
import type { Request, Response } from 'express';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  console.log('[API] Health check...');
  res.json({
    status: 'success',
    message: 'API is running',
    timestamp: Date.now(),
  });
});

export default router;
