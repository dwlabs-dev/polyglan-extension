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
  };
}

async function startRecording(retries = 3) {
  try {
    console.log(`[Offscreen] Requesting microphone access (Attempts left: ${retries})...`);

    // Ensure we have a gesture-like context or at least a fresh try
    audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    console.log('[Offscreen] ✅ Microphone access granted!');

    // Determine supported mimeType for recording
    const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus'
    ];
    
    let selectedMimeType = '';
    for (const type of mimeTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
            selectedMimeType = type;
            break;
        }
    }

    console.log(`[Offscreen] Selected MimeType: ${selectedMimeType || 'default'}`);
    
    mediaRecorder = new MediaRecorder(audioStream, selectedMimeType ? { mimeType: selectedMimeType } : {});

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

    // Capture chunks every 2 seconds for better real-time feel
    mediaRecorder.start(2000); 
    console.log('[Offscreen] MediaRecorder started.');

    // 2. Transcription (SpeechRecognition)
    initSpeechRecognition();
    if (recognition) {
       try {
           recognition.start();
           console.log('[Offscreen] Speech Recognition started.');
       } catch (e) {
           console.error('[Offscreen] Failed to start recognition:', e);
       }
    }

  } catch (err) {
    console.error(`[Offscreen] Failed to start recording/transcription (Retries left: ${retries}):`, err);
    
    if (retries > 0) {
        console.log('[Offscreen] Retrying in 1 second...');
        setTimeout(() => startRecording(retries - 1), 1000);
        return;
    }

    chrome.runtime.sendMessage({ type: 'RECORDING_ERROR', error: err instanceof Error ? err.message : String(err) });
  }
}

async function stopRecording() {
  console.log('[Offscreen] Stopping recording components...');

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    try { mediaRecorder.stop(); } catch(e) {}
  }

  if (recognition) {
    try { recognition.stop(); } catch(e) {}
  }

  if (audioStream) {
    audioStream.getTracks().forEach(track => track.stop());
    audioStream = null;
  }

  mediaRecorder = null;
  recognition = null;
  console.log('[Offscreen] Recording stopped.');
}

// ---------------------------------------------------------------------------
// Initialization & Audio Unlock
// ---------------------------------------------------------------------------

/**
 * Attempts to "unlock" the audio system by creating and resuming an AudioContext.
 * This can help bypass autoplay restrictions for MediaRecorder and SpeechRecognition.
 */
async function unlockAudio() {
    try {
        console.log('[Offscreen] Attempting to unlock audio context...');
        const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioContext) {
            const ctx = new AudioContext();
            if (ctx.state === 'suspended') {
                await ctx.resume();
                console.log('[Offscreen] AudioContext resumed successfully.');
            } else {
                console.log(`[Offscreen] AudioContext state is: ${ctx.state}`);
            }
        }
    } catch (e) {
        console.warn('[Offscreen] Could not unlock AudioContext (expected if no user gesture yet):', e);
    }
}

chrome.runtime.onMessage.addListener((message) => {
  console.log('[Offscreen] Message received:', message.type);
  if (message.type === 'START_RECORDING') {
    // Unlock audio system then start recording
    unlockAudio().then(() => startRecording());
  } else if (message.type === 'STOP_RECORDING') {
    stopRecording();
  } else if (message.type === 'SET_LANG') {
    if (recognition) {
      recognition.lang = message.lang;
    }
  }
});

// CRITICAL: Signal readiness immediately so Service Worker can send commands
chrome.runtime.sendMessage({ type: 'OFFSCREEN_READY' });
console.log('[Offscreen] Script loaded and OFFSCREEN_READY sent.');

// Initial unlock attempt (may fail, but good to try)
unlockAudio();

