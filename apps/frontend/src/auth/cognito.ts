import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { clearCurrentSessionUserType } from './session';

export const signInWithEmailPassword = async (
  username: string,
  password: string,
): Promise<void> => {
  console.debug('[auth] signInWithEmailPassword: calling Cognito signIn', {
    username,
  });
  const result = await signIn({ username, password });
  console.debug('[auth] signInWithEmailPassword: Cognito signIn result', {
    username,
    result: !!result,
  });
};

export const signOutUser = async (): Promise<void> => {
  console.debug(
    '[auth] signOutUser: clearing session and calling Cognito signOut',
  );
  clearCurrentSessionUserType();
  await signOut();
};

export const signUpWithEmailPassword = async (
  username: string,
  password: string,
): Promise<void> => {
  console.debug('[auth] signUpWithEmailPassword: calling Cognito signUp', {
    username,
  });
  const result = await signUp({ username, password });
  console.debug('[auth] signUpWithEmailPassword: Cognito signUp result', {
    username,
    result: !!result,
  });
};

export const getIdToken = async (): Promise<string | undefined> => {
  const session = await fetchAuthSession();
  const idToken = session.tokens?.idToken?.toString();
  if (idToken) {
    console.debug('[auth] getIdToken: retrieved id token (length)', {
      length: idToken.length,
    });
  } else {
    console.debug('[auth] getIdToken: no id token available');
  }
  return idToken;
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};
