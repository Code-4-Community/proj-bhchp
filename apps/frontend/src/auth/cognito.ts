import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { clearCurrentSessionUserType } from './session';

// These helpers wrap Amplify's lower-level auth methods so the rest of the app
// does not need to know about Cognito-specific calls or token retrieval.
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

  const result = await signUp({
    username,
    password,
    options: {
      userAttributes: {
        email: username,
      },
    },
  });
  console.debug('[auth] signUpWithEmailPassword: Cognito signUp result', {
    username,
    result: !!result,
  });
};

export const getIdToken = async (): Promise<string | undefined> => {
  // The ID token is what the frontend sends to protected backend endpoints.
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
  if (import.meta.env.VITE_DEV_AUTH_EMAIL) return true;

  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};
