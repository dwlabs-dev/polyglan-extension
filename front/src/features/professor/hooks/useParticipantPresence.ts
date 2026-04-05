import { useState, useEffect } from 'react';
import { socketService } from '../../../services/socket.service';

/**
 * Hook to track participant presence in the session
 */
export function useParticipantPresence(
  sessionId: string,
  onParticipantOnline?: (user: { userId: string, name?: string }) => void,
  onParticipantOffline?: (user: { userId: string, name?: string }) => void
) {
  const [onlineUserIds, setOnlineUserIds] = useState<Set<string>>(new Set());
  const [onlineNames, setOnlineNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Listener for INITIAL_PRESENCE (sent by server on PROFESSOR join)
    const offInitial = socketService.on('INITIAL_PRESENCE', (payload: any) => {

      console.log('[useParticipantPresence] Received initial presence:', payload.students);
      if (Array.isArray(payload.students)) {
        setOnlineUserIds(new Set(payload.students.map((s: any) => s.userId)));
        setOnlineNames(new Set(payload.students.filter((s: any) => s.name).map((s: any) => s.name)));

        // Notify parent of initial presence to merge them
        payload.students.forEach((student: any) => {
          if (onParticipantOnline) {
            onParticipantOnline(student);
          }
        });
      }
    });

    // Listener for PARTICIPANT_ONLINE
    const offOnline = socketService.on('PARTICIPANT_ONLINE', (payload: any) => {

      console.log(`[useParticipantPresence] User ${payload.userId} (${payload.name}) is online`);
      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.add(payload.userId);
        return next;
      });
      if (payload.name) {
        setOnlineNames(prev => {
          const next = new Set(prev);
          next.add(payload.name);
          return next;
        });
      }

      if (onParticipantOnline) {
        onParticipantOnline({ userId: payload.userId, name: payload.name });
      }
    });

    // Listener for PARTICIPANT_OFFLINE
    const offOffline = socketService.on('PARTICIPANT_OFFLINE', (payload: any) => {
      console.log(`[useParticipantPresence] User ${payload.userId} is offline`);

      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
      if (payload.name) {
        setOnlineNames(prev => {
          const next = new Set(prev);
          next.delete(payload.name);
          return next;
        });
      }

      if (onParticipantOffline) {
        onParticipantOffline({ userId: payload.userId, name: payload.name });
      }
    });

    // Fallback Listener for STUDENT_DISCONNECTED (in case API broadcasts it directly)
    const offStudentDisc = socketService.on('STUDENT_DISCONNECTED', (payload: any) => {
      console.log(`[useParticipantPresence] Fallback: User ${payload.userId} disconnected explicitly`);

      setOnlineUserIds(prev => {
        const next = new Set(prev);
        next.delete(payload.userId);
        return next;
      });
      if (payload.name) {
        setOnlineNames(prev => {
          const next = new Set(prev);
          next.delete(payload.name);
          return next;
        });
      }

      if (onParticipantOffline) {
        onParticipantOffline({ userId: payload.userId, name: payload.name });
      }
    });

    return () => {
      offInitial();
      offOnline();
      offOffline();
      offStudentDisc();
    };
  }, [sessionId, onParticipantOnline, onParticipantOffline]);

  return { onlineUserIds, onlineNames };
}
