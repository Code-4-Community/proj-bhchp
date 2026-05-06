import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import { createMockApiClientModule } from './test/mockApiClient';
import { UserType } from './api/types';

import App from './app';

vi.mock('@api/apiClient', () => createMockApiClientModule());
vi.mock('aws-amplify/auth', () => ({
  fetchAuthSession: vi.fn().mockResolvedValue({
    tokens: { idToken: { toString: () => 'test-token' } },
  }),
  getCurrentUser: vi.fn().mockResolvedValue({
    username: 'test-user',
    userId: 'test-user-id',
  }),
  fetchUserAttributes: vi.fn().mockResolvedValue({ email: 'test@example.com' }),
  signIn: vi.fn(),
  signOut: vi.fn(),
  signUp: vi.fn(),
}));
vi.mock('./auth/cognito', () => ({
  completePasswordReset: vi.fn(),
  getIdToken: vi.fn().mockResolvedValue('test-token'),
  isAuthenticated: vi.fn().mockResolvedValue(true),
  signInWithEmailPassword: vi.fn(),
  signOutUser: vi.fn(),
  startPasswordReset: vi.fn(),
  signUpWithEmailPassword: vi.fn(),
}));
vi.mock('./auth/current-session-user-type', () => ({
  fetchAndStoreCurrentSessionUserType: vi
    .fn()
    .mockResolvedValue(UserType.ADMIN),
  getCurrentSessionUserType: vi.fn().mockResolvedValue(UserType.ADMIN),
}));

describe('App', () => {
  it('should render successfully', () => {
    const { baseElement } = render(<App />);
    expect(baseElement).toBeTruthy();
  });

  it('should show the app title (BHCHP) in the component', async () => {
    render(<App />);
    expect(await screen.findByText('BHCHP')).toBeTruthy();
  });
});
