import { SupportedLang } from '../types/index';

declare const chrome: any;

class AuthService {
  async getToken(): Promise<string | null> {
    const result = await chrome.storage.local.get('token');
    return result.token || null;
  }

  async setToken(token: string): Promise<void> {
    await chrome.storage.local.set({ token });
  }

  async getStudentId(): Promise<string | null> {
    const result = await chrome.storage.local.get('studentId');
    return result.studentId || null;
  }

  async setStudentId(id: string): Promise<void> {
    await chrome.storage.local.set({ studentId: id });
  }

  async getSessionId(): Promise<string | null> {
    const result = await chrome.storage.local.get('sessionId');
    return result.sessionId || null;
  }

  async setSessionId(id: string): Promise<void> {
    await chrome.storage.local.set({ sessionId: id });
  }

  async getLang(): Promise<SupportedLang> {
    const result = await chrome.storage.local.get('lang');
    return (result.lang as SupportedLang) || 'pt-BR';
  }

  async setLang(lang: SupportedLang): Promise<void> {
    await chrome.storage.local.set({ lang });
  }

  async getGoogleEmail(): Promise<string | null> {
    const result = await chrome.storage.local.get('googleEmail');
    return result.googleEmail || null;
  }

  async setGoogleEmail(email: string): Promise<void> {
    await chrome.storage.local.set({ googleEmail: email });
  }

  async clear(): Promise<void> {
    await chrome.storage.local.remove(['token', 'studentId', 'sessionId', 'lang', 'googleEmail']);
  }

  async isSessionValid(): Promise<boolean> {
    const token = await this.getToken();
    const sessionId = await this.getSessionId();
    return !!(token && sessionId);
  }
}

export const authService = new AuthService();
