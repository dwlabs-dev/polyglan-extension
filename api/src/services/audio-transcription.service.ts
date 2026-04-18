/**
 * Audio Transcription Service — Polyglan Extension BFF
 *
 * 1. Sends a 30-second audio/webm buffer to OpenAI Whisper for transcription.
 * 2. On success, forwards the transcription to the polyglan-api for persistence.
 * 3. On failure, saves the raw buffer to ./failed-chunks/ for manual retry.
 */

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import FormData from 'form-data';
import fetch from 'node-fetch';
import type { Response } from 'node-fetch';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TranscriptionRequest {
  meetingId: string;
  speakerId: string;
  timestamp: number;
  audioBuffer: Buffer;
}

interface WhisperResponse {
  text: string;
}

interface PolyglanTranscriptionPayload {
  meetingId: string;
  speakerId: string;
  timestamp: number;
  transcription: string;
}

// ---------------------------------------------------------------------------
// Whisper call
// ---------------------------------------------------------------------------

async function callWhisper(audioBuffer: Buffer): Promise<string> {
  const openaiApiKey = requireEnv('OPENAI_API_KEY');

  // form-data (npm) serialises multipart correctly and provides headers via
  // getHeaders() — fully compatible with node-fetch and typed without issues.
  const form = new FormData();
  form.append('file', audioBuffer, { filename: 'chunk.webm', contentType: 'audio/webm' });
  form.append('model', 'whisper-1');
  form.append('language', 'pt');

  const response: Response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      ...form.getHeaders(),
    },
    body: form,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Whisper API error (${response.status}): ${errorText}`);
  }

  const json = (await response.json()) as WhisperResponse;
  return json.text.trim();
}

// ---------------------------------------------------------------------------
// polyglan-api call
// ---------------------------------------------------------------------------

async function saveToPolyglanApi(payload: PolyglanTranscriptionPayload): Promise<void> {
  const polyglanApiUrl = requireEnv('POLYGLAN_API_URL');
  const endpoint = `${polyglanApiUrl}/transcriptions`;

  const response: Response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`polyglan-api error (${response.status}): ${errorText}`);
  }

  console.log(
    `[TranscriptionService] Saved transcription for meeting=${payload.meetingId} speaker=${payload.speakerId}`
  );
}

// ---------------------------------------------------------------------------
// Fallback: persist failed chunk to disk
// ---------------------------------------------------------------------------

async function persistFailedChunk(speakerId: string, timestamp: number, audioBuffer: Buffer): Promise<void> {
  const dir = join(process.cwd(), 'failed-chunks');

  try {
    await mkdir(dir, { recursive: true });
  } catch (mkdirErr: unknown) {
    const message = mkdirErr instanceof Error ? mkdirErr.message : String(mkdirErr);
    console.error('[TranscriptionService] Could not create failed-chunks dir:', message);
    return;
  }

  const filename = `${speakerId}-${timestamp}.webm`;
  const filepath = join(dir, filename);

  try {
    await writeFile(filepath, audioBuffer);
    console.warn(`[TranscriptionService] Chunk saved for manual retry: ${filepath}`);
  } catch (writeErr: unknown) {
    const message = writeErr instanceof Error ? writeErr.message : String(writeErr);
    console.error('[TranscriptionService] Failed to write chunk file:', message);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function transcribeAudio(request: TranscriptionRequest): Promise<void> {
  const { meetingId, speakerId, timestamp, audioBuffer } = request;

  console.log(
    `[TranscriptionService] Transcribing ${audioBuffer.length} bytes for speaker=${speakerId} meeting=${meetingId}`
  );

  let transcription: string;

  try {
    transcription = await callWhisper(audioBuffer);
    console.log(`[TranscriptionService] Transcription: "${transcription.substring(0, 80)}…"`);
  } catch (whisperErr: unknown) {
    const message = whisperErr instanceof Error ? whisperErr.message : String(whisperErr);
    console.error('[TranscriptionService] Whisper failed:', message);

    // Persist the raw audio for manual retry and bail out
    await persistFailedChunk(speakerId, timestamp, audioBuffer);
    return;
  }

  try {
    await saveToPolyglanApi({ meetingId, speakerId, timestamp, transcription });
  } catch (apiErr: unknown) {
    const message = apiErr instanceof Error ? apiErr.message : String(apiErr);
    console.error('[TranscriptionService] polyglan-api save failed:', message);
    // Do NOT rethrow — the transcription succeeded; only the persistence step failed.
    // We still save the chunk so it can be re-submitted.
    await persistFailedChunk(speakerId, timestamp, audioBuffer);
  }
}
