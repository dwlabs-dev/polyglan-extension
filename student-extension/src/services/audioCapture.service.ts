/**
 * Audio Capture Service — Polyglan Student Extension (Proxy)
 *
 * This runs within the content-script (DOM of Google Meet).
 * It simply communicates with the Service Worker to manage recording and streaming.
 */

class AudioCaptureService {
  private isRecordingActive: boolean = false;

  public async start(meetingId: string, speakerId: string): Promise<void> {
    if (this.isRecordingActive) {
      console.warn('[AudioCaptureService] Already recording!');
      return;
    }

    console.log(`[AudioCaptureService] Requesting recording start for meeting ${meetingId}, speaker ${speakerId}...`);

    this.isRecordingActive = true;

    try {
      // Tell the Service Worker to start the offscreen recording
      await chrome.runtime.sendMessage({
        type: 'START_RECORDING',
        meetingId,
        speakerId
      });

      console.log('[AudioCaptureService] Start command sent to Service Worker.');
    } catch (err: any) {
      this.isRecordingActive = false;
      console.error('[AudioCaptureService] Failed to start recording via Service Worker:', err);
      throw err;
    }
  }

  public stop(): void {
    if (!this.isRecordingActive) {
      return;
    }

    console.log('[AudioCaptureService] Requesting recording stop...');
    this.isRecordingActive = false;

    try {
      chrome.runtime.sendMessage({ type: 'STOP_RECORDING' });
      console.log('[AudioCaptureService] Stop command sent to Service Worker.');
    } catch (err: any) {
      console.error('[AudioCaptureService] Failed to stop recording via Service Worker:', err);
    }
  }
}

export const audioCaptureService = new AudioCaptureService();
