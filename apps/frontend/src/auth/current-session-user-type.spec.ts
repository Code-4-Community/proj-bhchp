import { fetchUserAttributes } from 'aws-amplify/auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '../api/apiClient';
import { UserType } from '../api/types';

import {
  fetchAndStoreCurrentSessionUserType,
  getCurrentSessionUserType,
} from './current-session-user-type';
import {
  getCurrentSessionUserTypeFromStorage,
  setCurrentSessionUserType,
} from './session';

vi.mock('aws-amplify/auth', () => ({
  fetchUserAttributes: vi.fn(),
}));

vi.mock('../api/apiClient', () => ({
  default: {
    getCurrentUser: vi.fn(),
  },
}));

describe('getCurrentSessionUserType', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  it('returns the cached userType when Cognito session validation succeeds', async () => {
    setCurrentSessionUserType(UserType.STANDARD);

    const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
    mockFetchUserAttributes.mockResolvedValue({
      email: 'jane@example.com',
    } as never);

    await expect(getCurrentSessionUserType()).resolves.toBe(UserType.STANDARD);
    expect(getCurrentSessionUserTypeFromStorage()).toBe(UserType.STANDARD);
  });

  it('clears a cached userType when Cognito session is no longer valid', async () => {
    setCurrentSessionUserType(UserType.ADMIN);

    const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
    mockFetchUserAttributes.mockRejectedValue(new Error('session expired'));

    await expect(getCurrentSessionUserType()).resolves.toBeNull();
    expect(getCurrentSessionUserTypeFromStorage()).toBeNull();
  });

  it('clears a cached userType when Cognito returns no email', async () => {
    const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    setCurrentSessionUserType(UserType.ADMIN);
    mockFetchUserAttributes.mockResolvedValue({} as never);

    await expect(getCurrentSessionUserType()).resolves.toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
    expect(getCurrentSessionUserTypeFromStorage()).toBeNull();
  });

  describe('fetchAndStoreCurrentSessionUserType', () => {
    it('returns null and clears cache when Cognito has no email attribute', async () => {
      const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
      const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

      setCurrentSessionUserType(UserType.ADMIN);
      mockFetchUserAttributes.mockResolvedValue({} as never);

      await expect(fetchAndStoreCurrentSessionUserType()).resolves.toBeNull();
      expect(mockGetCurrentUser).not.toHaveBeenCalled();
      expect(getCurrentSessionUserTypeFromStorage()).toBeNull();
    });

    it('stores the backend userType when Cognito and backend both resolve', async () => {
      const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
      const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

      mockFetchUserAttributes.mockResolvedValue({
        email: 'jane@example.com',
      } as never);
      mockGetCurrentUser.mockResolvedValue({
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        userType: UserType.ADMIN,
      });

      await expect(fetchAndStoreCurrentSessionUserType()).resolves.toBe(
        UserType.ADMIN,
      );
      expect(getCurrentSessionUserTypeFromStorage()).toBe(UserType.ADMIN);
    });

    it('returns null and clears cache when the backend has no matching user', async () => {
      const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
      const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

      setCurrentSessionUserType(UserType.STANDARD);
      mockFetchUserAttributes.mockResolvedValue({
        email: 'jane@example.com',
      } as never);
      mockGetCurrentUser.mockResolvedValue(null);

      await expect(fetchAndStoreCurrentSessionUserType()).resolves.toBeNull();
      expect(getCurrentSessionUserTypeFromStorage()).toBeNull();
    });
  });

  it('fetches and stores the backend userType when no cache exists', async () => {
    const mockFetchUserAttributes = vi.mocked(fetchUserAttributes);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    mockFetchUserAttributes.mockResolvedValue({
      email: 'jane@example.com',
    } as never);
    mockGetCurrentUser.mockResolvedValue({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      userType: UserType.STANDARD,
    });

    await expect(getCurrentSessionUserType()).resolves.toBe(UserType.STANDARD);
    expect(getCurrentSessionUserTypeFromStorage()).toBe(UserType.STANDARD);
  });
});
