import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { randomUUID } from 'crypto';
import * as SessionService from '../services/session.service.js';

interface AuthenticatedWebSocket extends WebSocket {
  sessionId?: string;
  studentId?: string;
  isAlive?: boolean;
}

const sessionConnections = new Map<string, Set<AuthenticatedWebSocket>>();

export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: AuthenticatedWebSocket, req) => {
    console.log('[WS] New connection attempt');
    ws.isAlive = true;

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString());
        
        // Handle authentication/join message
        if (message.type === 'JOIN_SESSION') {
          const { sessionId, studentId, token } = message.payload;
          
          if (SessionService.verifyToken(sessionId, studentId, token)) {
            ws.sessionId = sessionId;
            ws.studentId = studentId;
            
            // Add to session group
            if (!sessionConnections.has(sessionId)) {
              sessionConnections.set(sessionId, new Set());
            }
            sessionConnections.get(sessionId)!.add(ws);
            
            console.log(`[WS] Student ${studentId} joined session ${sessionId}`);
            ws.send(JSON.stringify({ type: 'JOINED', payload: { status: 'success' } }));
          } else {
            console.warn(`[WS] Auth failed for student ${studentId} in session ${sessionId}`);
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid token' } }));
            ws.close();
          }
        }

        // Handle transcription fragments
        if (message.type === 'TRANSCRIPTION_FRAGMENT') {
          if (!ws.sessionId || !ws.studentId) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Not authenticated' } }));
            return;
          }
          
          console.log(`[WS] Transcription from ${ws.studentId}: ${message.payload.text.substring(0, 30)}...`);
          // TODO: Forward to transcription service or AI analysis
        }

      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      if (ws.sessionId && sessionConnections.has(ws.sessionId)) {
        sessionConnections.get(ws.sessionId)!.delete(ws);
        if (sessionConnections.get(ws.sessionId)!.size === 0) {
          sessionConnections.delete(ws.sessionId);
        }
      }
      console.log('[WS] Connection closed');
    });
  });

  // Keep-alive heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws: AuthenticatedWebSocket) => {
      if (ws.isAlive === false) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
  });

  console.log('[WS] WebSocket server initialized on /ws');
  return wss;
}

export function broadcastToSession(sessionId: string, message: any) {
  const clients = sessionConnections.get(sessionId);
  if (clients) {
    const payload = JSON.stringify(message);
    clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload);
      }
    });
    console.log(`[WS] Broadcasted message ${message.type} to session ${sessionId} (${clients.size} clients)`);
  }
}
