import { beforeEach, describe, expect, it, vi } from 'vitest';

import apiClient from '../api/apiClient';
import { UserType } from '../api/types';

import {
  fetchAndStoreCurrentSessionUserType,
  getCurrentSessionUserType,
} from './current-session-user-type';
import * as cognito from './cognito';

vi.mock('../api/apiClient', () => ({
  default: {
    getCurrentUser: vi.fn(),
  },
}));

vi.mock('./cognito', () => ({
  getIdToken: vi.fn(),
}));

describe('current session user type', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when there is no authenticated session', async () => {
    const mockGetIdToken = vi.mocked(cognito.getIdToken);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    mockGetIdToken.mockResolvedValue(undefined);

    await expect(getCurrentSessionUserType()).resolves.toBeNull();
    expect(mockGetCurrentUser).not.toHaveBeenCalled();
  });

  it('returns null when backend role lookup fails', async () => {
    const mockGetIdToken = vi.mocked(cognito.getIdToken);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    mockGetIdToken.mockResolvedValue('header.payload.signature');
    mockGetCurrentUser.mockRejectedValue(new Error('boom'));

    await expect(getCurrentSessionUserType()).resolves.toBeNull();
  });

  it('returns the backend userType for an authenticated session', async () => {
    const mockGetIdToken = vi.mocked(cognito.getIdToken);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    mockGetIdToken.mockResolvedValue('header.payload.signature');
    mockGetCurrentUser.mockResolvedValue({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      userType: UserType.ADMIN,
    });

    await expect(fetchAndStoreCurrentSessionUserType()).resolves.toBe(
      UserType.ADMIN,
    );
  });

  it('returns null when the backend has no matching user', async () => {
    const mockGetIdToken = vi.mocked(cognito.getIdToken);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    mockGetIdToken.mockResolvedValue('header.payload.signature');
    mockGetCurrentUser.mockResolvedValue(null);

    await expect(fetchAndStoreCurrentSessionUserType()).resolves.toBeNull();
  });

  it('revalidates against the backend each time a role check runs', async () => {
    const mockGetIdToken = vi.mocked(cognito.getIdToken);
    const mockGetCurrentUser = vi.mocked(apiClient.getCurrentUser);

    mockGetIdToken.mockResolvedValue('header.payload.signature');
    mockGetCurrentUser.mockResolvedValue({
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      userType: UserType.STANDARD,
    });

    await expect(getCurrentSessionUserType()).resolves.toBe(UserType.STANDARD);
    await expect(getCurrentSessionUserType()).resolves.toBe(UserType.STANDARD);
    expect(mockGetCurrentUser).toHaveBeenCalledTimes(2);
  });
});
