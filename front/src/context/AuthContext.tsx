import { createContext, useState, useEffect, type ReactNode } from 'react';
import { getMeetSession } from '../lib/meet';
import { setAuthToken } from '../services/api';

interface AuthContextValue {
  jwt: string | null;
  userId: string | null;
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
let authPromise: Promise<{ jwt: string; userId: string | null }> | null = null;

const fetchAuthToken = async () => {
  try {
    // 1. O Meet SDK autentica automaticamente via createAddonSession() no Singleton
    const session = await getMeetSession();

    // 2. Captura o token do Google via o SDK. 
    let meetToken = '';
    if (typeof session.getAuthToken === 'function') {
      meetToken = await session.getAuthToken();
    } else if (typeof session.getIdToken === 'function') {
      meetToken = await session.getIdToken();
    } else {
      // Fallback assumindo que o SDK adiciona o token na configuração global
      meetToken = 'meet-auth-token-fallback';
      console.warn('[AuthProvider] Meet token extraction method not found on session object. Using fallback.');
    }

    // 3. Envia o token para o endpoint POST /api/auth no polyglan-api
    const response = await fetch(`/api/auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetToken })
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
    return { jwt: token, userId: data.userId || null };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    // Usar o Singleton para pegar o resultado da autenticação
    getAuthResult()
      .then(({ jwt, userId }) => {
        if (isMounted) {
          setJwt(jwt);
          setUserId(userId);
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
    <AuthContext.Provider value={{ jwt, userId, isAuthenticated: !!jwt, loading, error, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};
