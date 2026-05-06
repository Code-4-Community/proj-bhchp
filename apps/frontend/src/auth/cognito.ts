import {
  confirmResetPassword,
  confirmSignIn,
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  signIn,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { clearCurrentSessionUserType } from './session';
import { clearDisciplineAdminMapCache } from '@utils/disciplineAdminCache';

export type SignInWithPasswordResult =
  | {
      kind: 'SIGNED_IN';
    }
  | {
      kind: 'NEW_PASSWORD_REQUIRED';
    }
  | {
      kind: 'RESET_PASSWORD_REQUIRED';
    }
  | {
      kind: 'UNSUPPORTED_CHALLENGE';
      signInStep?: string;
    };

export type PasswordResetDeliveryDetails = {
  destination?: string;
  deliveryMedium?: string;
};

export type StartPasswordResetResult =
  | {
      kind: 'CONFIRM_RESET_WITH_CODE';
      delivery?: PasswordResetDeliveryDetails;
    }
  | {
      kind: 'DONE';
    };

// These helpers wrap Amplify's lower-level auth methods so the rest of the app
// does not need to know about Cognito-specific calls or token retrieval.
/**
 * Signs in a user with Cognito username/password credentials.
 *
 * @param username Cognito username (email in this app).
 * @param password Raw password entered by the user.
 */
export const signInWithEmailPassword = async (
  username: string,
  password: string,
): Promise<SignInWithPasswordResult> => {
  console.debug('[auth] signInWithEmailPassword: calling Cognito signIn', {
    username,
  });
  const result = await signIn({ username, password });
  console.debug('[auth] signInWithEmailPassword: Cognito signIn result', {
    username,
    result: !!result,
    isSignedIn: result.isSignedIn,
    signInStep: result.nextStep?.signInStep,
  });

  if (result.isSignedIn) {
    return {
      kind: 'SIGNED_IN',
    };
  }

  if (
    result.nextStep?.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED'
  ) {
    return {
      kind: 'NEW_PASSWORD_REQUIRED',
    };
  }

  if (result.nextStep?.signInStep === 'RESET_PASSWORD') {
    return {
      kind: 'RESET_PASSWORD_REQUIRED',
    };
  }

  console.warn(
    '[auth] signInWithEmailPassword: unsupported sign-in challenge',
    {
      username,
      signInStep: result.nextStep?.signInStep,
    },
  );
  return {
    kind: 'UNSUPPORTED_CHALLENGE',
    signInStep: result.nextStep?.signInStep,
  };
};

/**
 * Completes Cognito's first-login new-password challenge for invited users.
 *
 * @param newPassword Password chosen by the invited user.
 */
export const confirmSignInWithNewPassword = async (
  newPassword: string,
): Promise<void> => {
  console.debug('[auth] confirmSignInWithNewPassword: confirming challenge');
  await confirmSignIn({
    challengeResponse: newPassword,
  });
};

/**
 * Starts Cognito's forgot-password flow by sending a confirmation code to the
 * user's configured delivery destination.
 *
 * @param username Cognito username (email in this app).
 */
export const startPasswordReset = async (
  username: string,
): Promise<StartPasswordResetResult> => {
  console.debug('[auth] startPasswordReset: requesting code from Cognito', {
    username,
  });

  const result = await resetPassword({
    username,
  });

  if (result.nextStep.resetPasswordStep === 'DONE') {
    return {
      kind: 'DONE',
    };
  }

  return {
    kind: 'CONFIRM_RESET_WITH_CODE',
    delivery: {
      destination: result.nextStep.codeDeliveryDetails.destination,
      deliveryMedium: result.nextStep.codeDeliveryDetails.deliveryMedium,
    },
  };
};

/**
 * Completes Cognito's forgot-password flow using the code delivered to the
 * user and the new password they chose.
 *
 * @param username Cognito username (email in this app).
 * @param confirmationCode Verification code sent by Cognito.
 * @param newPassword New password selected by the user.
 */
export const completePasswordReset = async (
  username: string,
  confirmationCode: string,
  newPassword: string,
): Promise<void> => {
  console.debug('[auth] completePasswordReset: confirming reset with Cognito', {
    username,
  });

  await confirmResetPassword({
    username,
    confirmationCode,
    newPassword,
  });
};

/**
 * Signs out the current user and clears session-cached role data.
 */
export const signOutUser = async (): Promise<void> => {
  console.debug(
    '[auth] signOutUser: clearing session and calling Cognito signOut',
  );
  clearCurrentSessionUserType();
  clearDisciplineAdminMapCache();
  await signOut();
};

/**
 * Registers a new Cognito user account.
 *
 * @param username Cognito username (email in this app).
 * @param password Password chosen by the user.
 */
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

/**
 * Retrieves the current Cognito ID token for backend authenticated requests.
 *
 * @returns Encoded ID token string when available, otherwise `undefined`.
 */
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

/**
 * Checks whether a valid Cognito session exists.
 *
 * @returns `true` when a user is authenticated; otherwise `false`.
 */
export const isAuthenticated = async (): Promise<boolean> => {
  if (import.meta.env.VITE_DEV_AUTH_EMAIL) return true;

  try {
    await getCurrentUser();
    return true;
  } catch {
    return false;
  }
};
