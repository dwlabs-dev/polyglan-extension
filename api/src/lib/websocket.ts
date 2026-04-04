import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { randomUUID } from 'crypto';
import * as SessionService from '../services/session.service.js';

/**
 * Types for WebSocket Message management
 */
export type WsMessageType =
  | 'TRANSCRIPTION_FRAGMENT'    // student → API
  | 'START_MODE'                // professor → API
  | 'STOP_MODE'                 // professor → API
  | 'PAUSE_MODE'                // professor → API
  | 'STUDENT_CONNECTED'         // student → API
  | 'PROFESSOR_CONNECTED'       // professor → API
  | 'SESSION_COMMAND'           // API → students
  | 'MODE_CHANGED'              // API → all clients
  | 'PARTICIPANT_ONLINE'        // API → professor
  | 'PARTICIPANT_OFFLINE'       // API → professor
  | 'INITIAL_PRESENCE'          // API → professor
  | 'REQUEST_PRESENCE'          // professor → API (explicit request)
  | 'FEEDBACK'                  // API → specific student
  | 'JOIN_SESSION'              // student → API (handshake)
  | 'JOINED'                    // API → client
  | 'ERROR';                    // API → client

/**
 * Normalize meeting code by removing hyphens and lowercasing.
 * Ensures professor (SDK) and student (URL) join the same room.
 */
export function normalizeMeetingCode(code: string): string {
  return code.replace(/-/g, '').toLowerCase().trim();
}

export interface WsMessage {
  type: WsMessageType;
  sessionId: string;
  payload: any;
  timestamp: number;
}

export type RoomClient = {
  ws: WebSocket;
  userId: string;
  name?: string;
  role: 'PROFESSOR' | 'STUDENT';
  connectedAt: number;
};

// Internal room storage: sessionId -> RoomClient[]
const rooms = new Map<string, RoomClient[]>();

/**
 * Initialize WebSocket Server
 */
export function initWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('[WS] New raw connection');

    ws.on('message', async (data) => {
      try {
        const message = JSON.parse(data.toString()) as WsMessage;
        const { type, payload } = message;
        const sessionId = normalizeMeetingCode(message.sessionId || '');

        // 1. Initial Handshake / Registration
        if (type === 'PROFESSOR_CONNECTED' || type === 'JOIN_SESSION' || type === 'STUDENT_CONNECTED') {
          const userId = payload.studentId || payload.userId;

          let role: 'PROFESSOR' | 'STUDENT' = 'STUDENT';
          if (type === 'PROFESSOR_CONNECTED') {
            role = 'PROFESSOR';
          } else if (type === 'JOIN_SESSION' || type === 'STUDENT_CONNECTED') {
            role = 'STUDENT';
          } // We explicitly enforce boundaries based on message type instead of unverified payload properties.

          // If it's a join session, we verify token (legacy support)
          if (type === 'JOIN_SESSION' && !SessionService.verifyToken(sessionId, userId, payload.token)) {
            ws.send(JSON.stringify({ type: 'ERROR', payload: { message: 'Invalid token' } }));
            ws.close();
            return;
          }

          console.log(`[WS] ${type} registration:`, { userId, role, sessionId });
          registerClient(ws, sessionId, userId, role, payload.name);

          ws.send(JSON.stringify({ type: 'JOINED', payload: { status: 'success', userId } }));

          // Notify professor if a student connected or send initial list to professor
          if (role === 'STUDENT') {
            sendToProfessor(sessionId, {
              type: 'PARTICIPANT_ONLINE',
              sessionId,
              payload: { userId, name: payload.name },
              timestamp: Date.now()
            });
          } else if (role === 'PROFESSOR') {
            const onlineStudents = getOnlineStudentsInfo(sessionId);
            ws.send(JSON.stringify({
              type: 'INITIAL_PRESENCE',
              sessionId,
              payload: { students: onlineStudents },
              timestamp: Date.now()
            }));
          }
          return;
        }

        // Request Presence (professor explicitly asks for online students)
        if (type === 'REQUEST_PRESENCE') {
          const onlineStudents = getOnlineStudentsInfo(sessionId);
          console.log(`[WS] REQUEST_PRESENCE for room ${sessionId}, found ${onlineStudents.length} students`);
          ws.send(JSON.stringify({
            type: 'INITIAL_PRESENCE',
            sessionId,
            payload: { students: onlineStudents },
            timestamp: Date.now()
          }));
          return;
        }

        // 2. Professor Commands
        if (type === 'START_MODE' || type === 'PAUSE_MODE' || type === 'STOP_MODE') {
          handleModeCommand(sessionId, type, payload);
          return;
        }

        // 3. Transcription Fragments
        if (type === 'TRANSCRIPTION_FRAGMENT') {
          // Log or process transcription
          console.log(`[WS] Transcription from ${payload.studentId || 'unknown'}: ${payload.text.substring(0, 30)}...`);
          return;
        }

      } catch (error) {
        console.error('[WS] Error processing message:', error);
      }
    });

    ws.on('close', () => {
      removeClient(ws);
    });
  });

  return wss;
}

/**
 * Room Management Helpers
 */

export function registerClient(ws: WebSocket, sessionId: string, userId: string, role: 'PROFESSOR' | 'STUDENT', name?: string) {
  if (!rooms.has(sessionId)) {
    rooms.set(sessionId, []);
  }

  const clientList = rooms.get(sessionId)!;

  // Remove existing connection for same user if exists (to prevent duplicates)
  const existingIndex = clientList.findIndex(c => c.userId === userId && c.role === role);
  if (existingIndex > -1) {
    clientList.splice(existingIndex, 1);
  }

  clientList.push({
    ws,
    userId,
    name,
    role,
    connectedAt: Date.now()
  });

  console.log(`[WS] Registered ${role} ${userId} in room ${sessionId}`);
}

export function removeClient(ws: WebSocket) {
  for (const [sessionId, clients] of rooms.entries()) {
    const index = clients.findIndex(c => c.ws === ws);
    if (index > -1) {
      const removed = clients.splice(index, 1)[0];
      console.log(`[WS] Removed ${removed.role} ${removed.userId} from room ${sessionId}`);

      // Notify professor if a student disconnected
      if (removed.role === 'STUDENT') {
        sendToProfessor(sessionId, {
          type: 'PARTICIPANT_OFFLINE',
          sessionId,
          payload: { userId: removed.userId, name: removed.name },
          timestamp: Date.now()
        });
      }

      if (clients.length === 0) {
        rooms.delete(sessionId);
      }
      break;
    }
  }
}

export function broadcastToStudents(sessionId: string, message: WsMessage) {
  const clients = rooms.get(sessionId);
  if (clients) {
    const payload = JSON.stringify(message);
    clients.forEach(client => {
      if (client.role === 'STUDENT' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }
}

export function sendToProfessor(sessionId: string, message: WsMessage) {
  const clients = rooms.get(sessionId);
  if (clients) {
    const payload = JSON.stringify(message);
    clients.forEach(client => {
      if (client.role === 'PROFESSOR' && client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }
}

/**
 * Broadcast to ALL clients in a session (Students + Professor)
 */
export function broadcastToRoom(sessionId: string, message: WsMessage) {
  const clients = rooms.get(sessionId);
  if (clients) {
    const payload = JSON.stringify(message);
    clients.forEach(client => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(payload);
      }
    });
  }
}

// Alias for compatibility
export const broadcastToSession = broadcastToRoom;

export function sendToStudent(sessionId: string, userId: string, message: WsMessage) {
  const clients = rooms.get(sessionId);
  if (clients) {
    const client = clients.find(c => c.userId === userId && c.role === 'STUDENT');
    if (client && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(JSON.stringify(message));
    }
  }
}

export function getOnlineStudents(sessionId: string): string[] {
  const clients = rooms.get(sessionId);
  if (!clients) return [];
  return clients.filter(c => c.role === 'STUDENT').map(c => c.userId);
}

export function getOnlineStudentsInfo(sessionId: string): { userId: string, name?: string }[] {
  const clients = rooms.get(sessionId);
  if (!clients) return [];
  return clients
    .filter(c => c.role === 'STUDENT')
    .map(c => ({ userId: c.userId, name: c.name }));
}

/**
 * Handle mode commands (Start/Pause/Stop)
 */
function handleModeCommand(sessionId: string, type: string, payload: any) {
  let modeSegmentId: string | null = null;
  let command: 'START' | 'PAUSE' | 'STOP' = 'STOP';
  let mode: string | null = payload.mode || null;

  if (type === 'START_MODE') {
    modeSegmentId = randomUUID();
    command = 'START';
    SessionService.setSessionMode(sessionId, mode, modeSegmentId);
  } else if (type === 'PAUSE_MODE') {
    command = 'PAUSE';
    SessionService.setSessionMode(sessionId, null, null);
  } else {
    command = 'STOP';
    SessionService.setSessionMode(sessionId, null, null);
  }

  // 1. Notify all students
  broadcastToStudents(sessionId, {
    type: 'SESSION_COMMAND',
    sessionId,
    payload: { command, mode, modeSegmentId },
    timestamp: Date.now()
  });

  // 2. Notify profesor (confirmation)
  sendToProfessor(sessionId, {
    type: 'MODE_CHANGED',
    sessionId,
    payload: { mode, modeSegmentId, status: command.toLowerCase() },
    timestamp: Date.now()
  });

  console.log(`[WS] Session ${sessionId} mode changed to ${command} (${mode || 'none'})`);
}
