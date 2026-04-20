import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import Login from './login';
import { DISCIPLINE_VALUES, UserType } from '../api/types';

const { signInWithEmailPasswordMock, confirmSignInWithNewPasswordMock } =
  vi.hoisted(() => ({
    signInWithEmailPasswordMock: vi.fn(),
    confirmSignInWithNewPasswordMock: vi.fn(),
  }));

const {
  fetchAndStoreCurrentSessionUserTypeMock,
  getCurrentSessionUserTypeMock,
} = vi.hoisted(() => ({
  fetchAndStoreCurrentSessionUserTypeMock: vi.fn(),
  getCurrentSessionUserTypeMock: vi.fn(),
}));

const { prefetchDisciplineAdminMapMock } = vi.hoisted(() => ({
  prefetchDisciplineAdminMapMock: vi.fn(),
}));

vi.mock('../auth/cognito', () => ({
  signInWithEmailPassword: signInWithEmailPasswordMock,
  confirmSignInWithNewPassword: confirmSignInWithNewPasswordMock,
  signOutUser: vi.fn(),
}));

vi.mock('../auth/current-session-user-type', () => ({
  fetchAndStoreCurrentSessionUserType: fetchAndStoreCurrentSessionUserTypeMock,
  getCurrentSessionUserType: getCurrentSessionUserTypeMock,
}));

vi.mock('@utils/disciplineAdminCache', () => ({
  prefetchDisciplineAdminMap: prefetchDisciplineAdminMapMock,
}));

function renderLogin() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <Login />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    signInWithEmailPasswordMock.mockReset();
    confirmSignInWithNewPasswordMock.mockReset();
    fetchAndStoreCurrentSessionUserTypeMock.mockReset();
    getCurrentSessionUserTypeMock.mockReset();
    getCurrentSessionUserTypeMock.mockResolvedValue(null);
  });

  it('resolves the backend role after a standard Cognito sign-in', async () => {
    signInWithEmailPasswordMock.mockResolvedValue({ kind: 'SIGNED_IN' });
    fetchAndStoreCurrentSessionUserTypeMock.mockResolvedValue(UserType.ADMIN);

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'TempPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(signInWithEmailPasswordMock).toHaveBeenCalledWith(
        'ada@example.com',
        'TempPass123!',
      );
    });
    await waitFor(() => {
      expect(fetchAndStoreCurrentSessionUserTypeMock).toHaveBeenCalledTimes(1);
    });
    expect(prefetchDisciplineAdminMapMock).toHaveBeenCalledWith(
      undefined,
      Object.values(DISCIPLINE_VALUES),
    );
    expect(confirmSignInWithNewPasswordMock).not.toHaveBeenCalled();
  });

  it('shows the new-password form when Cognito requires it and completes the challenge before fetching the backend role', async () => {
    signInWithEmailPasswordMock.mockResolvedValue({
      kind: 'NEW_PASSWORD_REQUIRED',
    });
    confirmSignInWithNewPasswordMock.mockResolvedValue(undefined);
    fetchAndStoreCurrentSessionUserTypeMock.mockResolvedValue(UserType.ADMIN);

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'invited-admin@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'TempPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Set Your Password')).toBeTruthy();
    expect(fetchAndStoreCurrentSessionUserTypeMock).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'BetterPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), {
      target: { value: 'BetterPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Set Password' }));

    await waitFor(() => {
      expect(confirmSignInWithNewPasswordMock).toHaveBeenCalledWith(
        'BetterPass123!',
      );
    });
    await waitFor(() => {
      expect(fetchAndStoreCurrentSessionUserTypeMock).toHaveBeenCalledTimes(1);
    });
  });

  it('does not call backend role resolution for unsupported Cognito challenges', async () => {
    signInWithEmailPasswordMock.mockResolvedValue({
      kind: 'UNSUPPORTED_CHALLENGE',
      signInStep: 'CONFIRM_SIGN_IN_WITH_SMS_CODE',
    });

    renderLogin();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Password'), {
      target: { value: 'TempPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(
      await screen.findByText(
        'This sign-in flow requires an unsupported challenge (CONFIRM_SIGN_IN_WITH_SMS_CODE).',
      ),
    ).toBeTruthy();
    expect(fetchAndStoreCurrentSessionUserTypeMock).not.toHaveBeenCalled();
    expect(confirmSignInWithNewPasswordMock).not.toHaveBeenCalled();
  });
});
