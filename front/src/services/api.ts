const API_BASE = '/api';
const JWT_KEY = 'polyglan_jwt';

/**
 * Set the authentication token for all subsequent API requests.
 */
export function setAuthToken(token: string) {
  localStorage.setItem(JWT_KEY, token);
}

/**
 * Base fetch wrapper with error handling and automatic JWT authentication.
 */
export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const storedJwt = localStorage.getItem(JWT_KEY);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  if (storedJwt) {
    (headers as any)['Authorization'] = `Bearer ${storedJwt}`;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || `API error: ${response.status}`);
  }

  return data as T;
}
