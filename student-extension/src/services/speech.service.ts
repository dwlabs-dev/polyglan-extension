import { SupportedLang } from '../types/index';

class SpeechService {
  private recognition: any;
  private error: string | null = null;

  constructor() {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
    }
  }

  isSupported(): boolean {
    return this.recognition !== undefined;
  }

  start(lang: SupportedLang, onFragment: (text: string, isFinal: boolean) => void): void {
    if (!this.recognition) return;

    this.error = null;
    this.recognition.lang = lang;
    let explicitStop = false;

    this.recognition.onstart = () => {
      console.log('[SpeechService] Recognition started');
    };

    this.recognition.onresult = (event: any) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptSegment = event.results[i][0].transcript;
        transcript += transcriptSegment;
      }

      const isFinal = event.results[event.results.length - 1].isFinal;
      onFragment(transcript, isFinal);
    };

    this.recognition.onerror = (event: any) => {
      console.warn('[SpeechService] Error:', event.error);
      if (event.error === 'not-allowed') {
        this.error = 'mic-denied';
      } else if (event.error === 'network') {
        this.error = 'network';
      }
    };

    this.recognition.onend = () => {
      console.log('[SpeechService] Recognition ended');
      // Auto-restart if not explicitly stopped
      if (!explicitStop) {
        console.log('[SpeechService] Auto-restarting...');
        try {
          this.recognition.start();
        } catch (e) {
          console.error('[SpeechService] Restart failed:', e);
        }
      }
    };

    // Override stop to prevent auto-restart
    const originalStop = this.recognition.stop.bind(this.recognition);
    this.stop = () => {
        explicitStop = true;
        originalStop();
        console.log('[SpeechService] Explicitly stopped');
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.error('[SpeechService] Initial start failed:', e);
    }
  }

  pause(): void {
    if (this.recognition) {
       try {
         this.recognition.stop();
         console.log('[SpeechService] Paused');
       } catch (e) {
         console.warn('[SpeechService] Pause failed', e);
       }
    }
  }

  resume(): void {
    if (this.recognition) {
        try {
          this.recognition.start();
          console.log('[SpeechService] Resumed');
        } catch (e) {
          console.warn('[SpeechService] Resume failed', e);
        }
    }
  }

  stop(): void {
    // This will be overridden in start()
    if (this.recognition) this.recognition.stop();
  }

  getError(): string | null {
    return this.error;
  }
}

export const speechService = new SpeechService();
