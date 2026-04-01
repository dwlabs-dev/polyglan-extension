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

    this.recognition.onstart = () => {
      console.log('Speech recognition started');
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
      console.log('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        this.error = 'mic-denied';
      } else if (event.error === 'no-speech') {
        this.error = 'no-speech';
      } else if (event.error === 'audio-capture') {
        this.error = 'audio-capture';
      } else if (event.error === 'network') {
        this.error = 'network';
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
    };

    this.recognition.start();
  }

  pause(): void {
    if (!this.recognition) return;
    try {
      this.recognition.stop();
      console.log('[SpeechService] Recognition paused');
    } catch (e) {
      console.warn('[SpeechService] Error pausing:', e);
    }
  }

  resume(): void {
    if (!this.recognition) return;
    try {
      this.recognition.start();
      console.log('[SpeechService] Recognition resumed');
    } catch (e) {
      console.warn('[SpeechService] Error resuming:', e);
    }
  }

  stop(): void {
    if (!this.recognition) return;
    try {
      this.recognition.onstart = null;
      this.recognition.onresult = null;
      this.recognition.onerror = null;
      this.recognition.onend = null;
      this.recognition.stop();
      console.log('[SpeechService] Recognition stopped and handlers cleared');
    } catch (e) {
      console.warn('[SpeechService] Error stopping:', e);
    }
  }

  getError(): string | null {
    return this.error;
  }
}

export const speechService = new SpeechService();
