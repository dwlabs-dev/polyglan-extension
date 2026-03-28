import { Router } from 'express';
import type { Request, Response } from 'express';
import { ensureAuthenticated } from '@middlewares/auth.middleware.js';
import * as MeetService from '@services/meet.service.js';
import { PolyglanService } from '@services/polyglan.service.js';
import { getAccessToken } from '@lib/context.js';

const router = Router();

/**
 * POST /api/session/start
 * Body: { type: "Debate" | "History", participants: string[] }
 * Requires at least 2 participants.
 */
router.post('/api/session/start', ensureAuthenticated, async (req: Request, res: Response) => {
  const { type, participants } = req.body;
  const accessToken = getAccessToken() as string;

  // Validate type
  const validTypes = ['Debate', 'History'];
  if (!type || !validTypes.includes(type)) {
    res.status(400).json({
      status: 'error',
      message: `Invalid type. Must be one of: ${validTypes.join(', ')}`,
    });
    return;
  }

  if (type == "Debate") {
    if (!Array.isArray(participants) || participants.length < 2) {
      res.status(400).json({
        status: 'error',
        message: 'At least 2 participants are required.',
      });
      return;
    }
  }

  try {
    const conferenceRecord = await MeetService.getCurrentConferenceRecord(accessToken);
    console.log(`[SessionRoute] Starting session for ${conferenceRecord.name}`);

    // 1. Initialize Audio Stream (Requested Scope)
    await MeetService.initializeMediaStream(conferenceRecord.name);

    // 2. Mock Background Analysis & Reporting
    // We don't await this because it's a background process while the session is active.
    (async () => {
      console.log(`[SessionRoute] Analysis background thread started...`);

      // Simulate the session duration (5 seconds for mock purposes)
      await new Promise(resolve => setTimeout(resolve, 5000));

      const result = await PolyglanService.generateSessionResult(type, participants);

      // 3. Post Summary and Winner to the Meet Chat
      const message = `[Polyglan] Session Complete!\nType: ${type}\n${result.winner ? `Winner: ${result.winner}\n` : ''}\nSummary: ${result.summary}`;
      await MeetService.sendMeetingChatMessage(conferenceRecord.name, message);
    })();

    res.json({
      status: 'success',
      message: `Session ${type} initialized with media processing.`,
      conferenceRecord: conferenceRecord.name,
      participants,
    });
  } catch (error) {
    console.error('[SessionRoute] Error:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

export default router;
