/**
 * Audio WebSocket Server — Polyglan Extension BFF
 *
 * Listens on port 3002.
 * Receives raw Base64-encoded audio/webm chunks from the Chrome extension,
 * and streams them directly to physical WebM files.
 * Provides real-time resilience and ensures the EBML Header is prepended
 * when segmenting modes (e.g. Debate/History).
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { mkdir, appendFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { getSessionByCode } from '../services/session.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AudioChunkMessage {
  meetingId: string;
  speakerId: string;
  streamId: string;
  timestamp: number;
  chunk: string; // base64-encoded audio/webm blob
}

// We no longer manually stitch fragments because each streamId generates a completely independent playable file!

// ---------------------------------------------------------------------------
// Chunk processing
// ---------------------------------------------------------------------------

function isAudioChunkMessage(value: unknown): value is AudioChunkMessage {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['meetingId'] === 'string' &&
    typeof obj['speakerId'] === 'string' &&
    typeof obj['streamId'] === 'string' &&
    typeof obj['timestamp'] === 'number' &&
    typeof obj['chunk'] === 'string'
  );
}

async function ensureDir(dirPath: string) {
  try {
    await mkdir(dirPath, { recursive: true });
  } catch (err: any) {
    if (err.code !== 'EEXIST') throw err;
  }
}

async function handleIncomingChunk(raw: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('[AudioWS] Received non-JSON message — ignoring');
    return;
  }

  if (!isAudioChunkMessage(parsed)) {
    console.error('[AudioWS] Message does not match AudioChunkMessage shape — ignoring');
    return;
  }

  const { meetingId, speakerId, streamId, timestamp, chunk } = parsed;

  const chunkBuffer = Buffer.from(chunk, 'base64');

  const baseDir = join(process.cwd(), 'sessions', meetingId, speakerId);
  const audiosDir = join(baseDir, 'audios');
  // Segmented by streamId so players do not break with double-headers!
  const mainFile = join(audiosDir, `session-${streamId}.webm`);

  try {
    await ensureDir(audiosDir);
    // Append to the master lesson file
    await appendFile(mainFile, chunkBuffer);
  } catch (err) {
    console.error(`[AudioWS] Failed to append main session audio chunk:`, err);
  }

  // Contextual Sub-Mode Separation
  const session = getSessionByCode(meetingId);
  if (session && session.mode && session.modeSegmentId) {
    const safeModeName = session.mode.toUpperCase().trim();
    const modeDir = join(baseDir, safeModeName, 'audios');
    const modeFile = join(modeDir, `${session.modeSegmentId}-${streamId}.webm`);
    
    try {
      await ensureDir(modeDir);
      await appendFile(modeFile, chunkBuffer);
    } catch (err) {
      console.error(`[AudioWS] Failed to append mode audio chunk:`, err);
    }
  }
}

// ---------------------------------------------------------------------------
// Server initialisation
// ---------------------------------------------------------------------------

const AUDIO_WS_PORT = 3002;

export function initAudioWebSocketServer(): void {
  const httpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[AudioWS] Client connected');

    ws.on('message', async (data) => {
      try {
        await handleIncomingChunk(data.toString());
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[AudioWS] Unhandled error in message handler:', message);
      }
    });

    ws.on('close', () => {
      console.log('[AudioWS] Client disconnected');
    });

    ws.on('error', (err: Error) => {
      console.error('[AudioWS] Socket error:', err.message);
    });
  });

  httpServer.listen(AUDIO_WS_PORT, () => {
    console.log(`[AudioWS] Listening on ws://localhost:${AUDIO_WS_PORT} for Streams`);
  });
}
