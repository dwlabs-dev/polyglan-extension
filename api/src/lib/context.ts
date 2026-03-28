import { AsyncLocalStorage } from 'node:async_hooks';

export interface RequestContext {
  accessToken?: string;
}

export const contextStore = new AsyncLocalStorage<RequestContext>();

/**
 * Helper function to retrieve the current request context data.
 */
export const getContext = (): RequestContext | undefined => {
  return contextStore.getStore();
};

/**
 * Helper function to retrieve the access token from the current request context.
 */
export const getAccessToken = (): string | undefined => {
  return contextStore.getStore()?.accessToken;
};
