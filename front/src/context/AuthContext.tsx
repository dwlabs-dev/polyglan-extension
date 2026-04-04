import { createContext, useState, useEffect, type ReactNode } from 'react';
import { setAuthToken } from '../services/api';

interface AuthContextValue {
  jwt: string | null;
  userId: string | null;
  meetingId: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  getAuthHeader: () => { Authorization: string };
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Singleton to store the authentication promise.
 * This ensures that even in React Strict Mode (where components remount),
 * the actual network request and SDK call only happen once.
 */
let authPromise: Promise<{ jwt: string; userId: string | null, meetingId: string | null }> | null = null;

const fetchAuthToken = async () => {
  try {
    const response = await fetch(`/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      throw new Error('Falha na autenticação com o Polyglan API');
    }

    const data = await response.json();

    // 4. Armazenar o JWT retornado e dados do professor em memória
    const token = data.access_token || data.credentials?.access_token;
    if (!token) {
      throw new Error('Token de acesso não encontrado na resposta.');
    }

    setAuthToken(token);
    return { jwt: token, userId: data.userId || null, meetingId: data.meetingId };
  } catch (error: any) {
    // Se falhar, limpamos a promise para que uma nova tentativa possa ser feita no futuro se o app remountar
    authPromise = null;
    throw error;
  }
};

export const getAuthResult = () => {
  if (!authPromise) {
    authPromise = fetchAuthToken();
  }
  return authPromise;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [jwt, setJwt] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [meetingId, setMeetingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Usar o Singleton para pegar o resultado da autenticação
    getAuthResult()
      .then(({ jwt, userId, meetingId }) => {
        if (isMounted) {
          setJwt(jwt);
          setUserId(userId);
          setMeetingId(meetingId);
          setLoading(false);
          console.log('[AuthProvider] Autenticação concluída com sucesso');
        }
      })
      .catch((err: any) => {
        if (isMounted) {
          console.error('[AuthProvider] Erro de Autenticação:', err);
          setError(err.message || 'Erro de conexão.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const getAuthHeader = () => {
    return { Authorization: jwt ? `Bearer ${jwt}` : '' };
  };

  return (
    <AuthContext.Provider value={{ jwt, userId, meetingId, isAuthenticated: !!jwt, loading, error, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};
