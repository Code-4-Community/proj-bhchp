import {
  fetchAuthSession,
  getCurrentUser,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';

export const signInWithEmailPassword = async (
  username: string,
  password: string,
): Promise<void> => {
  await signIn({ username, password });
};

export const signOutUser = async (): Promise<void> => {
  await signOut();
};

export const signUpWithEmailPassword = async (
  username: string,
  password: string,
): Promise<void> => {
  await signUp({ username, password });
};

export const getIdToken = async (): Promise<string | undefined> => {
  const session = await fetchAuthSession();
  return session.tokens?.idToken?.toString();
};

export const isAuthenticated = async (): Promise<boolean> => {
  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};
