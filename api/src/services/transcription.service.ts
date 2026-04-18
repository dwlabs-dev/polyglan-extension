import fs from 'fs';
import path from 'path';

export interface TranscriptionFragment {
  studentId: string;
  sessionId: string;
  text: string;
  isFinal: boolean;
  lang: string;
  mode: string | null;
  modeSegmentId: string | null;
  timestamp: number;
}

// Simple JSON file-based store for MVP (Resolved to absolute path to prevent CWD issues)
const DATA_DIR = path.resolve(process.cwd(), 'data');
const TRANSCRIPTIONS_FILE = path.resolve(DATA_DIR, 'transcriptions.json');

/**
 * Ensures the data directory and transcription file exist.
 */
function ensureStorage() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      console.log(`[TranscriptionService] Creating data directory at ${DATA_DIR}`);
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(TRANSCRIPTIONS_FILE)) {
      console.log(`[TranscriptionService] Creating transcriptions file at ${TRANSCRIPTIONS_FILE}`);
      fs.writeFileSync(TRANSCRIPTIONS_FILE, JSON.stringify([], null, 2));
    }
  } catch (err) {
    console.error('[TranscriptionService] Storage initialization failed:', err);
  }
}

/**
 * Saves a transcription fragment to persistent storage.
 */
export function saveFragment(fragment: TranscriptionFragment): void {
  try {
    ensureStorage();
    
    let fragments: TranscriptionFragment[] = [];
    try {
      const rawData = fs.readFileSync(TRANSCRIPTIONS_FILE, 'utf-8');
      fragments = rawData ? JSON.parse(rawData) : [];
    } catch (parseErr) {
      console.warn('[TranscriptionService] Failed to parse transcriptions.json, resetting to empty array');
      fragments = [];
    }
    
    // Validate required fields for differentiation
    if (!fragment.studentId || !fragment.sessionId) {
        console.warn('[TranscriptionService] Dropping fragment: Missing studentId or sessionId');
        return;
    }

    fragments.push(fragment);
    
    fs.writeFileSync(TRANSCRIPTIONS_FILE, JSON.stringify(fragments, null, 2));
    
    console.log(`[TranscriptionService] SUCCESS: Captured fragment from Student[${fragment.studentId}] in Room[${fragment.sessionId}] | Mode: ${fragment.mode || 'DEBATE'}`);
  } catch (error) {
    console.error('[TranscriptionService] CRITICAL Error saving fragment:', error);
  }
}

/**
 * Gets fragments for a specific mode segment.
 */
export function getFragmentsBySegment(modeSegmentId: string): TranscriptionFragment[] {
  try {
    ensureStorage();
    const rawData = fs.readFileSync(TRANSCRIPTIONS_FILE, 'utf-8');
    const fragments: TranscriptionFragment[] = JSON.parse(rawData);
    return fragments.filter(f => f.modeSegmentId === modeSegmentId);
  } catch (error) {
    console.error('[TranscriptionService] Error retrieving fragments:', error);
    return [];
  }
}
