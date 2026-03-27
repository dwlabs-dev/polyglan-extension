import { meet } from '@googleworkspace/meet-addons';

let sessionPromise: Promise<any> | null = null;

/**
 * Returns a singleton Promise of the Meet Addon Session.
 * Once created, it always returns the same instance to prevent
 * "The addon session has already been created" errors.
 */
export const getMeetSession = () => {
  if (!sessionPromise) {
    sessionPromise = meet.addon.createAddonSession({
      cloudProjectNumber: import.meta.env.VITE_GOOGLE_CLOUD_PROJECT_NUMBER || '1082613234514',
    });
  }
  return sessionPromise;
};