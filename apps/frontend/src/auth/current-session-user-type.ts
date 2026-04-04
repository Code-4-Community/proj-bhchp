import apiClient from '../api/apiClient';
import { UserType } from '../api/types';
import { getIdToken } from './cognito';

import {
  clearCurrentSessionUserType,
  getCurrentSessionUserTypeFromStorage,
  setCurrentSessionUserType,
} from './session';

const getEmailFromIdToken = (idToken: string): string | null => {
  try {
    const payloadPart = idToken.split('.')[1];
    if (!payloadPart) {
      return null;
    }

    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );

    const payload = JSON.parse(atob(padded)) as { email?: unknown };
    return typeof payload.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
};

// After Cognito sign-in, the frontend asks the backend for the user's app
// record so route guards can use the app's own ADMIN/STANDARD role data.
export const fetchAndStoreCurrentSessionUserType =
  async (): Promise<UserType | null> => {
    console.debug(
      '[auth] fetchAndStoreCurrentSessionUserType: resolving user email from id token',
    );

    const idToken = await getIdToken();
    const email = idToken ? getEmailFromIdToken(idToken) : null;
    console.debug('[auth] ID token email resolved', {
      hasIdToken: !!idToken,
      hasEmail: !!email,
      email,
    });

    if (!email) {
      console.debug(
        '[auth] No email found in ID token; clearing session userType',
      );
      clearCurrentSessionUserType();
      return null;
    }

    console.debug('[auth] calling backend for current user role', {
      email,
      normalizedEmail: email.trim().toLowerCase(),
    });
    // The backend is the source of truth for app roles; we cache the result in
    // session storage for the current browser tab session.
    let user = null;
    try {
      user = await apiClient.getCurrentUser();
    } catch (err) {
      console.error('[auth] backend /api/users/me request failed', err);
      throw err;
    }

    if (!user) {
      console.debug(
        '[auth] No backend user found for Cognito email; clearing session userType',
        {
          email,
          normalizedEmail: email.trim().toLowerCase(),
        },
      );
      clearCurrentSessionUserType();
      return null;
    }

    console.debug('[auth] backend returned user', {
      cognitoEmail: email,
      backendEmail: user?.email,
      userType: user?.userType,
    });

    setCurrentSessionUserType(user.userType);
    return user.userType;
  };

export const getCurrentSessionUserType = async (): Promise<UserType | null> => {
  // Prefer the cached role first so route guards do not call the backend on
  // every render, but only if an unexpired ID token still exists.
  const storedUserType = getCurrentSessionUserTypeFromStorage();
  if (storedUserType) {
    const idToken = await getIdToken();
    if (idToken) {
      return storedUserType;
    }

    clearCurrentSessionUserType();
    return null;
  }

  try {
    return await fetchAndStoreCurrentSessionUserType();
  } catch {
    clearCurrentSessionUserType();
    return null;
  }
};
