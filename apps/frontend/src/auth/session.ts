import { UserType } from '../api/types';

const userTypeSessionKey = 'bhchp.currentUserType';

const isBrowser = typeof window !== 'undefined';

export const setCurrentSessionUserType = (userType: UserType | null): void => {
  if (!isBrowser) return;

  if (!userType) {
    sessionStorage.removeItem(userTypeSessionKey);
    return;
  }

  sessionStorage.setItem(userTypeSessionKey, userType);
};

export const clearCurrentSessionUserType = (): void => {
  if (!isBrowser) return;
  sessionStorage.removeItem(userTypeSessionKey);
};

export const getCurrentSessionUserTypeFromStorage = (): UserType | null => {
  if (!isBrowser) return null;

  const stored = sessionStorage.getItem(userTypeSessionKey);

  if (stored === UserType.ADMIN || stored === UserType.STANDARD) {
    return stored;
  }

  return null;
};
