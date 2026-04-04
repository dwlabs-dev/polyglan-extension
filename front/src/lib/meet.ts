import { type AddonSession } from '@googleworkspace/meet-addons';

let sessionPromise: Promise<AddonSession> | null = null;

/**
 * Returns a singleton Promise of the Meet Addon Session.
 * Once created, it always returns the same instance to prevent
 * "The addon session has already been created" errors.
 */
export const getMeetSession = (): Promise<AddonSession> => {
  if (!sessionPromise) {
    sessionPromise = window.meet.addon.createAddonSession({
      cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER,
    });
  }
  return sessionPromise;
};