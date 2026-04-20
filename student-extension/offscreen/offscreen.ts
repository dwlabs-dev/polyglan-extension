/**
 * Offscreen Document — Polyglan Student Extension
 *
 * Handles MediaRecorder (audio) and SpeechRecognition (transcription)
 * to bypass CSP and lifecycle issues of Content Scripts.
 */

let mediaRecorder: MediaRecorder | null = null;
let audioStream: MediaStream | null = null;
let recognition: any = null; // SpeechRecognition

/**
 * Initializes the Speech Recognition engine.
 */
function initSpeechRecognition() {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn('[Offscreen] SpeechRecognition is not supported in this browser.');
    return;
  }

  recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'pt-BR'; // Default, will be updated via message

  recognition.onresult = (event: any) => {
    let interimTranscript = '';
    let finalTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript;
      } else {
        interimTranscript += event.results[i][0].transcript;
      }
    }

    if (finalTranscript) {
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPTION_FRAGMENT',
        payload: {
          text: finalTranscript,
          isFinal: true
        }
      });
    }

    if (interimTranscript) {
      chrome.runtime.sendMessage({
        type: 'TRANSCRIPTION_FRAGMENT',
        payload: {
          text: interimTranscript,
          isFinal: false
        }
      });
    }
  };

  recognition.onerror = (event: any) => {
    console.error('[Offscreen] Speech Recognition error:', event.error);
  };

  recognition.onend = () => {
    console.log('[Offscreen] Speech Recognition ended.');
    // If we are still supposed to be recording, restart it
    // This is a simplified approach; in a robust implementation, we'd track state
  };
}

async function startRecording() {
  try {
    console.log('[Offscreen] Starting recording and transcription...');

    // 1. Audio Capture (MediaRecorder)
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    mediaRecorder = new MediaRecorder(audioStream, { mimeType: 'audio/webm;codecs=opus' });

    mediaRecorder.ondataavailable = async (event) => {
      if (event.data.size > 0) {
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

    mediaRecorder.start(5000); // 5 second chunks

    // 2. Transcription (SpeechRecognition)
    initSpeechRecognition();
    if (recognition) {
      recognition.start();
    }

    // Notify Service Worker that we are ready
    chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });

  } catch (err) {
    console.error('[Offscreen] Failed to start recording/transcription:', err);
    chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: err instanceof Error ? err.message : String(err) });
  }
}

async function stopRecording() {
  console.log('[Offscreen] Stopping recording and transcription...');

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  if (recognition) {
    recognition.stop();
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  mediaRecorder = null;
  recognition = null;
}

chrome.runtime.onMessage.addListener((message) => {
  console.log('[Offscreen] Received message:', message);
  if (message.type === 'START_RECORDING') {
    startRecording();
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  } else if (message.type === 'SET_LANG') {
    if (recognition) {
      recognition.lang = message.lang;
    }
  }
});
