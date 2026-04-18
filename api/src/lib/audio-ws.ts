/**
 * Audio WebSocket Server — Polyglan Extension BFF
 *
 * Listens on port 3002 (separate from the session/presence WS on port 3001).
 * Receives raw Base64-encoded audio/webm chunks from the Chrome extension,
 * buffers them per speakerId, and dispatches async transcription once
 * 30 seconds of audio have accumulated (6 × 5-second chunks).
 */

import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';
import { transcribeAudio } from '../services/audio-transcription.service.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AudioChunkMessage {
  meetingId: string;
  speakerId: string;
  timestamp: number;
  chunk: string; // base64-encoded audio/webm blob
}

interface SpeakerBuffer {
  meetingId: string;
  chunks: Buffer[];
  firstTimestamp: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Number of 5-second chunks to accumulate before triggering transcription. */
const CHUNKS_PER_BATCH = 6; // ≈ 30 seconds

// ---------------------------------------------------------------------------
// In-memory buffer: speakerId → SpeakerBuffer
// ---------------------------------------------------------------------------

const speakerBuffers = new Map<string, SpeakerBuffer>();

// ---------------------------------------------------------------------------
// Chunk processing
// ---------------------------------------------------------------------------

function isAudioChunkMessage(value: unknown): value is AudioChunkMessage {
  if (typeof value !== 'object' || value === null) return false;
  const obj = value as Record<string, unknown>;
  return (
    typeof obj['meetingId'] === 'string' &&
    typeof obj['speakerId'] === 'string' &&
    typeof obj['timestamp'] === 'number' &&
    typeof obj['chunk'] === 'string'
  );
}

function handleIncomingChunk(raw: string): void {
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

  const { meetingId, speakerId, timestamp, chunk } = parsed;

  // Decode Base64 → Buffer
  let chunkBuffer: Buffer;
  try {
    chunkBuffer = Buffer.from(chunk, 'base64');
  } catch {
    console.error('[AudioWS] Failed to decode Base64 chunk for speaker', speakerId);
    return;
  }

  // Retrieve or initialise the speaker's buffer
  if (!speakerBuffers.has(speakerId)) {
    speakerBuffers.set(speakerId, {
      meetingId,
      chunks: [],
      firstTimestamp: timestamp,
    });
  }

  const buffer = speakerBuffers.get(speakerId)!;
  buffer.chunks.push(chunkBuffer);

  console.log(
    `[AudioWS] Buffered chunk for ${speakerId} (${buffer.chunks.length}/${CHUNKS_PER_BATCH}) in meeting ${meetingId}`
  );

  // Flush when we have enough chunks
  if (buffer.chunks.length >= CHUNKS_PER_BATCH) {
    flushBuffer(speakerId, buffer);
  }
}

function flushBuffer(speakerId: string, buffer: SpeakerBuffer): void {
  // Remove from map immediately so new chunks start a fresh buffer
  speakerBuffers.delete(speakerId);

  const { meetingId, firstTimestamp, chunks } = buffer;

  // Concatenate all chunk Buffers into one
  const audioBuffer = Buffer.concat(chunks);

  console.log(
    `[AudioWS] Flushing ${chunks.length} chunks (${audioBuffer.length} bytes) for speaker ${speakerId}`
  );

  // Fire-and-forget: transcription is async and must not block the WS handler
  transcribeAudio({ meetingId, speakerId, timestamp: firstTimestamp, audioBuffer }).catch(
    (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[AudioWS] Transcription failed for ${speakerId}: ${message}`);
    }
  );
}

// ---------------------------------------------------------------------------
// Server initialisation
// ---------------------------------------------------------------------------

const AUDIO_WS_PORT = 3002;

export function initAudioWebSocketServer(): void {
  // Create a standalone HTTP server so the Audio WS runs on its own port
  // independently of the Express server on port 3001.
  const httpServer = createServer();
  const wss = new WebSocketServer({ server: httpServer });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[AudioWS] Client connected');

    ws.on('message', (data) => {
      try {
        handleIncomingChunk(data.toString());
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
    console.log(`[AudioWS] Listening on ws://localhost:${AUDIO_WS_PORT}`);
  });
}
