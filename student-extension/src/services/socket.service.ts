import { WsMessage } from '../types/index';

class SocketService {
  private ws: WebSocket | null = null;
  private messageHandler: ((message: WsMessage) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: any = null;
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  private intentionalClose = false;

  connect(sessionId: string, userId: string, userName?: string, protocol: 'http' | 'https' = 'https'): void {
    this.currentSessionId = sessionId;
    this.currentUserId = userId;
    this.currentUserName = userName || null;
    this.intentionalClose = false;

    let wsUrl = (import.meta.env.VITE_WS_URL as string);
    const staleUrl = 'true-stack-periodically-modern.trycloudflare.com';

    if (!wsUrl || wsUrl === 'undefined' || wsUrl.includes(staleUrl)) {
        console.log(`[SocketService] 🛠️ Overriding stale/missing URL with localhost`);
        wsUrl = 'ws://localhost:3002/ws';
    } else {
        wsUrl = wsUrl.endsWith('/ws') ? wsUrl : `${wsUrl.replace(/\/$/, '')}/ws`;
    }

    // Enforce WSS if protocol is https and it's not localhost
    if (protocol === 'https' && wsUrl.startsWith('ws://') && !wsUrl.includes('localhost')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
    }

    const url = `${wsUrl}?sessionId=${sessionId}`;

    console.log(`[SocketService] 🔌 Connecting to WebSocket: ${url}`);

    try {
      if (this.ws) {
        this.intentionalClose = true;
        this.ws.close();
      }

      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('[SocketService] Connected');
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;

        // Send STUDENT_CONNECTED immediately on open
        this.send({
          type: 'STUDENT_CONNECTED',
          sessionId: this.currentSessionId!,
          payload: {
            userId: this.currentUserId,
            name: this.currentUserName,
            role: 'STUDENT'
          },
          timestamp: Date.now()
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as WsMessage;
          console.log(`[SocketService] Received ${message.type}`, message.payload);
          if (this.messageHandler) {
            this.messageHandler(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (!this.intentionalClose) {
          this.attemptReconnect();
        }
        this.intentionalClose = false; // Reset for next connection
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      if (!this.intentionalClose) {
        this.attemptReconnect();
      }
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log('Max reconnect attempts reached');
      return;
    }

    if (!this.currentSessionId || !this.currentUserId) return;

    this.reconnectAttempts++;
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);

    console.log(
      `Reconnecting in ${this.reconnectDelay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    const timerFunc = () => {
      if (this.currentSessionId && this.currentUserId) {
        this.connect(this.currentSessionId, this.currentUserId, this.currentUserName || undefined);
      }
    };

    if (typeof setTimeout !== 'undefined') {
      this.reconnectTimer = setTimeout(timerFunc, this.reconnectDelay);
    } else {
      this.reconnectTimer = setInterval(timerFunc, this.reconnectDelay);
    }
  }

  send(message: WsMessage): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  }

  onMessage(handler: (message: WsMessage) => void): void {
    this.messageHandler = handler;
  }

  disconnect(): void {
    this.currentSessionId = null;
    this.currentUserId = null;
    this.currentUserName = null;

    if (this.reconnectTimer) {
      if (typeof clearTimeout !== 'undefined') {
        clearTimeout(this.reconnectTimer);
      } else if (typeof window !== 'undefined' && (window as any).clearTimeout) {
        (window as any).clearTimeout(this.reconnectTimer);
      }
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.onclose = null; // Prevent reconnect on intentional disconnect
      this.ws.close();
      this.ws = null;
    }

    this.reconnectAttempts = 0;
    this.reconnectDelay = 1000;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const socketService = new SocketService();
