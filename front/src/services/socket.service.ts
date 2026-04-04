/**
 * WebSocket Service for Professor Add-on
 */

export type WsMessageType =
  | 'TRANSCRIPTION_FRAGMENT'
  | 'START_MODE'
  | 'STOP_MODE'
  | 'PAUSE_MODE'
  | 'STUDENT_CONNECTED'
  | 'PROFESSOR_CONNECTED'
  | 'SESSION_COMMAND'
  | 'MODE_CHANGED'
  | 'PARTICIPANT_ONLINE'
  | 'PARTICIPANT_OFFLINE'
  | 'INITIAL_PRESENCE'
  | 'REQUEST_PRESENCE'
  | 'JOIN_SESSION'
  | 'FEEDBACK';

export interface WsMessage {
  type: WsMessageType;
  sessionId: string;
  payload: any;
  timestamp: number;
}

type MessageHandler = (payload: any) => void;

class SocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<WsMessageType, Set<MessageHandler>> = new Map();
  private sessionId: string | null = null;
  private userId: string | null = null;

  connect(url: string, sessionId: string, userId: string) {
    this.sessionId = sessionId;
    this.userId = userId;

    if (this.socket) {
      this.socket.close();
    }

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('[SocketService] Connected');
      // Register as professor
      this.send('PROFESSOR_CONNECTED', { userId: this.userId, role: 'PROFESSOR' });
    };

    this.socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WsMessage;
        console.log(`[SocketService] Received: ${message.type}`, message.payload);

        const typeHandlers = this.handlers.get(message.type);
        if (typeHandlers) {
          typeHandlers.forEach(handler => handler(message.payload));
        }
      } catch (e) {
        console.error('[SocketService] Error parsing message', e);
      }
    };

    this.socket.onclose = () => {
      console.log('[SocketService] Disconnected');
      // Reconnect logic could be added here
    };
  }

  on(type: WsMessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);
    return () => this.off(type, handler);
  }

  off(type: WsMessageType, handler: MessageHandler) {
    const typeHandlers = this.handlers.get(type);
    if (typeHandlers) {
      typeHandlers.delete(handler);
    }
  }

  send(type: WsMessageType, payload: any) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('[SocketService] Socket not connected');
      return;
    }

    const message: WsMessage = {
      type,
      sessionId: this.sessionId!,
      payload,
      timestamp: Date.now()
    };

    this.socket.send(JSON.stringify(message));
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
