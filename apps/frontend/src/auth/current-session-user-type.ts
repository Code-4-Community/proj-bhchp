import { fetchUserAttributes } from 'aws-amplify/auth';

import apiClient from '../api/apiClient';
import { UserType } from '../api/types';

import {
  clearCurrentSessionUserType,
  getCurrentSessionUserTypeFromStorage,
  setCurrentSessionUserType,
} from './session';

// After Cognito sign-in, the frontend asks the backend for the user's app
// record so route guards can use the app's own ADMIN/STANDARD role data.
/**
 * Fetches the current user's backend role and caches it in session storage.
 *
 * @returns The resolved role for this app, or `null` when unavailable.
 */
export const fetchAndStoreCurrentSessionUserType =
  async (): Promise<UserType | null> => {
    console.debug(
      '[auth] fetchAndStoreCurrentSessionUserType: fetching user attributes from Cognito',
    );
    const attributes = await fetchUserAttributes();
    const email = attributes.email;

    if (!email) {
      console.debug(
        '[auth] No email found in Cognito attributes; clearing session userType',
      );
      clearCurrentSessionUserType();
      return null;
    }

    console.debug('[auth] calling backend for current user role', { email });
    // The backend is the source of truth for app roles; we cache the result in
    // session storage for the current browser tab session.
    const user = await apiClient.getCurrentUser();

    if (!user) {
      console.debug(
        '[auth] No backend user found for email; clearing session userType',
      );
      clearCurrentSessionUserType();
      return null;
    }

    console.debug('[auth] backend returned user', {
      email,
      userType: user?.userType,
    });

    setCurrentSessionUserType(user.userType);
    return user.userType;
  };

/**
 * Returns the current session role from storage when possible, otherwise
 * refreshes it from Cognito/backend.
 *
 * @returns The current app role or `null` when unauthenticated/unresolved.
 */
export const getCurrentSessionUserType = async (): Promise<UserType | null> => {
  const devUserType = import.meta.env.VITE_DEV_AUTH_USER_TYPE as string;
  if (devUserType === UserType.ADMIN || devUserType === UserType.STANDARD) {
    return devUserType;
  }

  // Prefer the cached role first so route guards do not call the backend on
  // every render, but only if Cognito still considers the session valid.
  const storedUserType = getCurrentSessionUserTypeFromStorage();
  if (storedUserType) {
    try {
      const attributes = await fetchUserAttributes();
      if (!attributes.email) {
        clearCurrentSessionUserType();
        return null;
      }

      return storedUserType;
    } catch {
      clearCurrentSessionUserType();
      return null;
    }
  }

  try {
    return await fetchAndStoreCurrentSessionUserType();
  } catch {
    clearCurrentSessionUserType();
    return null;
  }
};
