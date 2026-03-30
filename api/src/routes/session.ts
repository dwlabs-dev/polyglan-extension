import { Router } from 'express';
import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import { ensureAuthenticated } from '@middlewares/auth.middleware.js';
import * as MeetService from '@services/meet.service.js';
import { PolyglanService } from '@services/polyglan.service.js';
import * as SessionService from '@services/session.service.js';
import { getAccessToken } from '@lib/context.js';
import { broadcastToSession } from '@lib/websocket.js';


const router = Router();

/**
 * POST /api/session/create
 * Body: { sessionCode: string }
 * Creates a new session for a professor
 * Requires authentication
 */
router.post('/api/session/create', ensureAuthenticated, async (req: Request, res: Response) => {
  const { sessionCode } = req.body;
  
  if (!sessionCode) {
    res.status(400).json({
      status: 'error',
      message: 'sessionCode is required',
    });
    return;
  }

  try {
    const professorId = (req as any).user?.id || 'professor_anonymous';
    const sessionId = SessionService.createSession(sessionCode, professorId);

    res.json({
      status: 'success',
      sessionId,
      sessionCode,
    });
  } catch (error) {
    console.error('[SessionRoute] Error creating session:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * POST /api/session/join
 * Body: { sessionCode: string, studentName: string, lang?: 'en-US' | 'pt-BR' }
 * Allows a student to join a session
 */
router.post('/api/session/join', async (req: Request, res: Response) => {
  const { sessionCode, studentName, lang } = req.body;

  if (!sessionCode || !studentName) {
    res.status(400).json({
      status: 'error',
      message: 'sessionCode and studentName are required',
    });
    return;
  }

  try {
    const result = SessionService.joinSession(sessionCode, studentName, lang || 'pt-BR');

    if (!result) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    res.json({
      status: 'success',
      token: result.token,
      sessionId: result.sessionId,
      studentId: result.studentId,
      lang: result.lang,
    });
  } catch (error) {
    console.error('[SessionRoute] Error joining session:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * GET /api/session/:id/state
 * Gets current session state
 */
router.get('/api/session/:id/state', async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const sessionId = id as string;
    const session = SessionService.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    const students = SessionService.getSessionStudents(sessionId);

    res.json({
      status: 'success',
      sessionId: session.sessionId,
      mode: session.mode,
      modeSegmentId: session.modeSegmentId,
      participants: students.map((s) => ({
        studentId: s.studentId,
        name: s.name,
      })),
    });
  } catch (error) {
    console.error('[SessionRoute] Error getting session state:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

/**
 * POST /api/session/:id/mode
 * Sets the session mode (professor only)
 * Body: { mode: 'DEBATE' | 'HISTORIA' | null }
 * Requires authentication
 */
router.post('/api/session/:id/mode', ensureAuthenticated, async (req: Request, res: Response) => {
  const { id } = req.params;
  const { mode } = req.body;

  try {
    const sessionId = id as string;
    const session = SessionService.getSession(sessionId);

    if (!session) {
      res.status(404).json({
        status: 'error',
        message: 'Session not found',
      });
      return;
    }

    // Generate modeSegmentId for tracking transcriptions per activity
    const modeSegmentId = mode ? randomUUID() : null;
    SessionService.setSessionMode(sessionId, mode, modeSegmentId);

    // Broadcast change to all students via WebSocket
    broadcastToSession(sessionId, {
      type: 'SESSION_COMMAND',
      payload: {
        command: mode ? 'START' : 'STOP',
        mode,
        modeSegmentId,
      },
      timestamp: Date.now(),
    });

    res.json({
      status: 'success',
      mode,
      modeSegmentId,
    });
  } catch (error) {
    console.error('[SessionRoute] Error setting session mode:', error);
    res.status(500).json({ status: 'error', message: 'Internal server error.' });
  }
});

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
