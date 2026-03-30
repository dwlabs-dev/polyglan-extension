/**
 * In-memory session store (MVP)
 * TODO: Replace with proper database
 */
interface SessionData {
  sessionId: string;
  sessionCode: string;
  createdAt: number;
  professorId: string;
  students: Map<string, StudentData>;
  mode: string | null;
  modeSegmentId: string | null;
}

interface StudentData {
  studentId: string;
  name: string;
  token: string;
  joinedAt: number;
  lang: 'en-US' | 'pt-BR';
}

const sessions = new Map<string, SessionData>();

/**
 * Creates a new session
 */
export function createSession(sessionCode: string, professorId: string): string {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  sessions.set(sessionId, {
    sessionId,
    sessionCode,
    createdAt: Date.now(),
    professorId,
    students: new Map(),
    mode: null,
    modeSegmentId: null,
  });

  return sessionId;
}

/**
 * Joins a student to a session
 */
export function joinSession(
  sessionCode: string, 
  studentName: string,
  lang: 'en-US' | 'pt-BR' = 'pt-BR'
): { sessionId: string; studentId: string; token: string; lang: 'en-US' | 'pt-BR' } | null {
  
  // Find session by code
  let targetSession: SessionData | undefined;
  for (const session of sessions.values()) {
    if (session.sessionCode === sessionCode) {
      targetSession = session;
      break;
    }
  }

  if (!targetSession) {
    return null;
  }

  const studentId = `student_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const token = `token_${Date.now()}_${Math.random().toString(36).substr(2, 36)}`;

  const studentData: StudentData = {
    studentId,
    name: studentName,
    token,
    joinedAt: Date.now(),
    lang,
  };

  targetSession.students.set(studentId, studentData);

  return {
    sessionId: targetSession.sessionId,
    studentId,
    token,
    lang,
  };
}

/**
 * Verifies a student's token
 */
export function verifyToken(sessionId: string, studentId: string, token: string): boolean {
  const session = sessions.get(sessionId);
  if (!session) return false;

  const student = session.students.get(studentId);
  if (!student) return false;

  return student.token === token;
}

/**
 * Gets session data
 */
export function getSession(sessionId: string): SessionData | undefined {
  return sessions.get(sessionId);
}

/**
 * Sets session mode
 */
export function setSessionMode(sessionId: string, mode: string | null, modeSegmentId: string | null): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.mode = mode;
    session.modeSegmentId = modeSegmentId;
  }
}

/**
 * Gets all students in a session
 */
export function getSessionStudents(sessionId: string): StudentData[] {
  const session = sessions.get(sessionId);
  if (!session) return [];
  return Array.from(session.students.values());
}
