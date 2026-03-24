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
 * Unified endpoint to start a session.
 * Body: { type: "Debate" | "History", participants: string[] }
 * Requires at least 2 participants.
 */
app.post('/api/session/start', (req: Request, res: Response) => {
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

/**
 * Endpoint to list available participants (mocked data)
 */
app.get('/api/participants', (_req: Request, res: Response) => {
  const participants = [
    { id: '1', name: 'Ana Silva', email: 'ana.silva@email.com', avatar: '👩‍🎓' },
    { id: '2', name: 'Carlos Oliveira', email: 'carlos.oliveira@email.com', avatar: '👨‍🎓' },
    { id: '3', name: 'Maria Santos', email: 'maria.santos@email.com', avatar: '👩‍💼' },
    { id: '4', name: 'Pedro Costa', email: 'pedro.costa@email.com', avatar: '👨‍💼' },
    { id: '5', name: 'Julia Pereira', email: 'julia.pereira@email.com', avatar: '👩‍🏫' },
    { id: '6', name: 'Lucas Ferreira', email: 'lucas.ferreira@email.com', avatar: '👨‍🏫' },
  ];

  console.log('[API] Listando participantes...');
  res.json({ status: 'success', participants });
});

app.listen(PORT, () => {
  console.log(`[API] Add-on server running on http://localhost:${PORT}`);
});
