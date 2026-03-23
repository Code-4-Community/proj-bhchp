import { fetchUserAttributes } from 'aws-amplify/auth';

import apiClient from '@api/apiClient';
import { UserType } from '@api/types';

import {
  clearCurrentSessionUserType,
  getCurrentSessionUserTypeFromStorage,
  setCurrentSessionUserType,
} from './session';

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

    console.debug('[auth] calling backend to fetch user by email', { email });
    const user = await apiClient.getUserByEmail(email);
    console.debug('[auth] backend returned user', {
      email,
      userType: user?.userType,
    });
    setCurrentSessionUserType(user.userType);
    return user.userType;
  };

export const getCurrentSessionUserType = async (): Promise<UserType | null> => {
  const storedUserType = getCurrentSessionUserTypeFromStorage();
  if (storedUserType) {
    return storedUserType;
  }

  try {
    return await fetchAndStoreCurrentSessionUserType();
  } catch {
    clearCurrentSessionUserType();
    return null;
  }
};
