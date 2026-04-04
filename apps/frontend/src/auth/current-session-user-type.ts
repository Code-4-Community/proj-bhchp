import apiClient from '../api/apiClient';
import { UserType } from '../api/types';
import { getIdToken } from './cognito';

// After Cognito sign-in, the frontend asks the backend for the user's app
// record so route guards can use the app's own ADMIN/STANDARD role data.
export const fetchAndStoreCurrentSessionUserType =
  async (): Promise<UserType | null> => {
    const idToken = await getIdToken();

    if (!idToken) {
      console.debug('[auth] No valid Cognito session found');
      return null;
    }

    console.debug('[auth] calling backend for current user role');
    let user = null;
    try {
      user = await apiClient.getCurrentUser();
    } catch (err) {
      console.error('[auth] backend /api/users/me request failed', err);
      throw err;
    }

    if (!user) {
      console.debug('[auth] No backend user found for authenticated session');
      return null;
    }

    console.debug('[auth] backend returned user', {
      backendEmail: user?.email,
      userType: user?.userType,
    });

    return user.userType;
  };

export const getCurrentSessionUserType = async (): Promise<UserType | null> => {
  try {
    return await fetchAndStoreCurrentSessionUserType();
  } catch {
    return null;
  }
};
