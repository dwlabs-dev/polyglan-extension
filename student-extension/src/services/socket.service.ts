import { WsMessage } from '../types/index';

class SocketService {
  private ws: WebSocket | null = null;
  private messageHandler: ((message: WsMessage) => void) | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private reconnectTimer: number | null = null;
  private currentSessionId: string | null = null;
  private currentUserId: string | null = null;
  private currentUserName: string | null = null;

  connect(sessionId: string, userId: string, userName?: string): void {
    this.currentSessionId = sessionId;
    this.currentUserId = userId;
    this.currentUserName = userName || null;

    const wsBaseUrl = import.meta.env.VITE_WS_URL || 'wss://tubes-prix-balloon-configuration.trycloudflare.com';
    // Ensure the URL ends with /ws and append sessionId as query param
    let wsUrl = wsBaseUrl.endsWith('/ws') ? wsBaseUrl : `${wsBaseUrl.replace(/\/$/, '')}/ws`;
    
    // Enforce WSS if on an HTTPS page (Google Meet requirement)
    if (window.location.protocol === 'https:' && wsUrl.startsWith('ws://')) {
      wsUrl = wsUrl.replace('ws://', 'wss://');
    }
    
    const url = `${wsUrl}?sessionId=${sessionId}`;

    console.log(`[SocketService] Connecting to ${url}`);

    try {
      if (this.ws) {
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
            name: this.currentUserName
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
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.attemptReconnect();
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

    this.reconnectTimer = window.setTimeout(() => {
      if (this.currentSessionId && this.currentUserId) {
        this.connect(this.currentSessionId, this.currentUserId, this.currentUserName || undefined);
      }
    }, this.reconnectDelay);
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
      clearTimeout(this.reconnectTimer);
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
