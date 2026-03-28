import { createContext, useState, useEffect, type ReactNode } from 'react';
import { getMeetSession } from '../lib/meet';

interface AuthContextValue {
  jwt: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  getAuthHeader: () => { Authorization: string };
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [jwt, setJwt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initAuth = async () => {
      try {
        setLoading(true);
        // 1. O Meet SDK autentica automaticamente via createAddonSession() no Singleton
        const session = await getMeetSession();

        // 2. Captura o token do Google via o SDK. 
        // Dependendo da versão exata do SDK, pode ser getIdToken(), getAuthToken(), etc.
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


        // 4. Envia o token para o endpoint POST /auth/meet no polyglan-api
        const response = await fetch(`/api/auth`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ meetToken })
        });

        if (!response.ok) {
          throw new Error('Falha na autenticação com o Polyglan API');
        }

        const data = await response.json();

        // 5. Armazenar o JWT retornado e dados do professor em memória
        // Adicionada compatibilidade com a resposta atual do '/api/auth' (data.credentials.access_token)
        const token = data.access_token || data.credentials?.access_token;

        if (!token) {
          throw new Error('Token de acesso não encontrado na resposta.');
        }

        setJwt(token);
      } catch (err: any) {
        console.error('[AuthProvider] Erro de Autenticação:', err);
        setError(err.message || 'Erro de conexão.');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const getAuthHeader = () => {
    return { Authorization: jwt ? `Bearer ${jwt}` : '' };
  };

  return (
    <AuthContext.Provider value={{ jwt, isAuthenticated: !!jwt, loading, error, getAuthHeader }}>
      {children}
    </AuthContext.Provider>
  );
};
