import {
  fetchAuthSession,
  getCurrentUser,
  signOut,
  signUp,
} from 'aws-amplify/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  getIdToken,
  isAuthenticated,
  signOutUser,
  signUpWithEmailPassword,
} from './cognito';

vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn(),
  getCurrentUser: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));

describe('cognito auth helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('signUpWithEmailPassword', () => {
    it('sends the email as a Cognito user attribute', async () => {
      const mockSignUp = vi.mocked(signUp);
      mockSignUp.mockResolvedValue({} as never);

      await signUpWithEmailPassword('jane@example.com', 'Password123!');

      expect(mockSignUp).toHaveBeenCalledWith({
        username: 'jane@example.com',
        password: 'Password123!',
        options: {
          userAttributes: {
            email: 'jane@example.com',
          },
        },
      });
    });
  });

  describe('getIdToken', () => {
    it('returns the ID token string when one is present', async () => {
      const mockFetchAuthSession = vi.mocked(fetchAuthSession);
      mockFetchAuthSession.mockResolvedValue({
        tokens: {
          idToken: {
            toString: () => 'header.payload.signature',
          },
        },
      } as never);

      await expect(getIdToken()).resolves.toBe('header.payload.signature');
    });

    it('returns undefined when no ID token is available', async () => {
      const mockFetchAuthSession = vi.mocked(fetchAuthSession);
      mockFetchAuthSession.mockResolvedValue({ tokens: undefined } as never);

      await expect(getIdToken()).resolves.toBeUndefined();
    });
  });

  describe('isAuthenticated', () => {
    it('returns true when Cognito has a current user', async () => {
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockResolvedValue({} as never);

      await expect(isAuthenticated()).resolves.toBe(true);
    });

    it('returns false when Cognito rejects current user lookup', async () => {
      const mockGetCurrentUser = vi.mocked(getCurrentUser);
      mockGetCurrentUser.mockRejectedValue(new Error('not signed in'));

      await expect(isAuthenticated()).resolves.toBe(false);
    });
  });

  describe('signOutUser', () => {
    it('calls Cognito sign out', async () => {
      const mockSignOut = vi.mocked(signOut);
      mockSignOut.mockResolvedValue(undefined as never);

      await signOutUser();

      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });

    it('surfaces Cognito sign out failures', async () => {
      const mockSignOut = vi.mocked(signOut);
      mockSignOut.mockRejectedValue(new Error('sign out failed'));

      await expect(signOutUser()).rejects.toThrow('sign out failed');
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
  });
});
