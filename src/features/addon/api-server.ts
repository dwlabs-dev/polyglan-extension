import express, { type Request, type Response } from 'express';
import cors from 'cors';
import path from 'node:path';
import { google } from 'googleapis';
import { authenticate } from '@google-cloud/local-auth';

const app = express();
const PORT = process.env.PORT || 3001;

const CREDENTIALS_PATH = path.join(process.cwd(), 'examples/credentials.json');
const SCOPES = [
  'https://www.googleapis.com/auth/meetings.space.created',
  'https://www.googleapis.com/auth/meetings.space.readonly'
];

// Helper to get Auth Client
async function getAuthClient() {
  return await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
}

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.get('/health', async (_req: Request, res: Response) => {
  try {
    console.log('[API] Health check...');

    res.json({
      status: 'success',
      message: `API is running at ${PORT}`
    });
  } catch (error: any) {
    console.error('[API] Erro ao criar espaço:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to create a new Meet Space
 */
app.post('/api/meet/create-space', async (_req: Request, res: Response) => {
  try {
    console.log('[API] Criando espaço de reunião...');
    const authClient = await getAuthClient();
    const meetClient = google.meet({ version: 'v2', auth: authClient as any });

    const response = await (meetClient.spaces as any).create({
      headers: {
        'Authorization': `Bearer ${authClient.credentials.access_token}`,
      },
      requestBody: {}
    });

    res.json({
      status: 'success',
      meetingName: response.data.name,
      meetingCode: response.data.meetingCode,
      meetingUri: response.data.meetingUri,
      space: response.data
    });
  } catch (error: any) {
    console.error('[API] Erro ao criar espaço:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Endpoint to start a debate session (mocked logic)
 */
app.post('/api/session/start-debate', (req: Request, res: Response) => {
  const { meetingId } = req.body;

  console.log(`[API] Iniciar Modo Debate para meetingId: ${meetingId}`);

  res.json({
    status: "success",
    timestamp: Date.now(),
    meetingId: meetingId
  });
});

app.listen(PORT, () => {
  console.log(`[API] Add-on server running on http://localhost:${PORT}`);
});
