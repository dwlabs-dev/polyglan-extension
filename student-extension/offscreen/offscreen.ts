/**
 * Offscreen Document — Polyglan Student Extension
 *
 * Handles MediaRecorder and getUserMedia to bypass CSP and lifecycle issues
 * of the Content Script/Service Worker.
 */

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;

async function startRecording() {
  try {
    console.log('[Offscreen] Starting recording...');

    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
        // Convert blob to Base64 to send via messaging
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const base64 = result.split(',')[1];
          if (base64) {
            chrome.runtime.sendMessage({
              type: 'AUDIO_CHUNK',
              chunk: base64
            });
          }
        };
        reader.readAsDataURL(event.data);
      }
    };

    // Capture chunks every 5 seconds as per the current strategy
    mediaRecorder.start(5000);
    console.log('[Offscreen] MediaRecorder started.');

    // Notify Service Worker that we are ready
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });

  } catch (err) {
    console.error('[Offscreen] Failed to start recording:', err);
    chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: err instanceof Error ? err.message : String(err) });
  }
}

async function stopRecording() {
  console.log('[Offscreen] Stopping recording...');

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  mediaRecorder = null;
  console.log('[Offscreen] Recording stopped.');
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'START_RECORDING') {
    startRecording();
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  }
});
