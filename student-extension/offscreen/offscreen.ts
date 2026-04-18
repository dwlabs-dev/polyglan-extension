/**
 * Offscreen Script for Polyglan Extension
 * 
 * This context is used because Service Workers cannot access MediaStreams 
 * or the tabCapture API directly for capturing. 
 * 
 * Responsibility:
 * 1. Listen for 'START_RECORDING' message from Service Worker.
 * 2. Obtain MediaStream using the provided streamId via getUserMedia.
 * 3. Handle MediaRecorder and stream chunks via WebSocket to BFF (port 3002).
 */

interface StartRecordingMessage {
    type: 'START_RECORDING';
    streamId: string;
    meetingId: string;
    speakerId: string;
}

interface StopRecordingMessage {
    type: 'STOP_RECORDING';
}

type OffscreenMessage = StartRecordingMessage | StopRecordingMessage;

let mediaRecorder: MediaRecorder | null = null;
let audioSocket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let currentMeetingId: string | null = null;
let currentSpeakerId: string | null = null;

const AUDIO_WS_URL = 'ws://localhost:3002';

// ---------------------------------------------------------------------------
// WebSocket helpers
// ---------------------------------------------------------------------------

function connectAudioSocket(): void {
    if (audioSocket && (audioSocket.readyState === WebSocket.OPEN || audioSocket.readyState === WebSocket.CONNECTING)) {
        return;
    }

    console.log(`[OffscreenWS] Connecting to ${AUDIO_WS_URL}`);
    audioSocket = new WebSocket(AUDIO_WS_URL);

    audioSocket.addEventListener('open', () => {
        console.log('[OffscreenWS] Connected to audio server');
    });

    audioSocket.addEventListener('close', () => {
        console.warn(`[OffscreenWS] Connection closed`);
        audioSocket = null;
        
        // Reconnect if we're still supposed to be recording
        if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            reconnectTimer = setTimeout(() => connectAudioSocket(), 2000);
        }
    });

    audioSocket.addEventListener('error', (err) => {
        console.error('[OffscreenWS] Error:', err);
    });
}

function sendChunk(chunk: string): void {
    if (audioSocket && audioSocket.readyState === WebSocket.OPEN) {
        audioSocket.send(JSON.stringify({
            meetingId: currentMeetingId,
            speakerId: currentSpeakerId,
            timestamp: Date.now(),
            chunk: chunk
        }));
    }
}

// ---------------------------------------------------------------------------
// Messaging Listener
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener((message: OffscreenMessage) => {
    if (message.type === 'START_RECORDING') {
        startRecording(message);
    } else if (message.type === 'STOP_RECORDING') {
        stopRecording();
    }
});

async function startRecording(config: StartRecordingMessage) {
    if (mediaRecorder) {
        console.warn('[Offscreen] Recording already in progress');
        return;
    }

    currentMeetingId = config.meetingId;
    currentSpeakerId = config.speakerId;

    try {
        console.log(`[Offscreen] Starting capture for streamId: ${config.streamId}`);
        
        // Get the stream using getUserMedia and the streamId from tabCapture
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                // @ts-ignore - chromeMediaSource is a Chrome-specific constraint
                mandatory: {
                    chromeMediaSource: 'tab',
                    chromeMediaSourceId: config.streamId
                }
            },
            video: false
        } as MediaStreamConstraints);

        // Start WebSocket
        connectAudioSocket();

        mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });

        mediaRecorder.ondataavailable = async (event) => {
            if (event.data.size > 0) {
                const buffer = await event.data.arrayBuffer();
                const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
                sendChunk(base64);
            }
        };

        mediaRecorder.onstop = () => {
            stream.getTracks().forEach(t => t.stop());
        };

        // Start recording in 5s chunks
        mediaRecorder.start(5000);
        console.log('[Offscreen] MediaRecorder started');

    } catch (err) {
        console.error('[Offscreen] Failed to start recording:', err);
    }
}

function stopRecording() {
    console.log('[Offscreen] Stopping recording');
    
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
    }
    mediaRecorder = null;

    if (audioSocket) {
        audioSocket.close();
        audioSocket = null;
    }
}
