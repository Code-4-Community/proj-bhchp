import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';

import PasswordReset from './PasswordReset';
import Login from './login';

const { startPasswordResetMock, completePasswordResetMock } = vi.hoisted(
  () => ({
    startPasswordResetMock: vi.fn(),
    completePasswordResetMock: vi.fn(),
  }),
);

const {
  fetchAndStoreCurrentSessionUserTypeMock,
  getCurrentSessionUserTypeMock,
} = vi.hoisted(() => ({
  fetchAndStoreCurrentSessionUserTypeMock: vi.fn(),
  getCurrentSessionUserTypeMock: vi.fn(),
}));

vi.mock('../auth/cognito', () => ({
  completePasswordReset: completePasswordResetMock,
  confirmSignInWithNewPassword: vi.fn(),
  getIdToken: vi.fn(),
  isAuthenticated: vi.fn(),
  signInWithEmailPassword: vi.fn(),
  signOutUser: vi.fn(),
  startPasswordReset: startPasswordResetMock,
}));

vi.mock('../auth/current-session-user-type', () => ({
  fetchAndStoreCurrentSessionUserType: fetchAndStoreCurrentSessionUserTypeMock,
  getCurrentSessionUserType: getCurrentSessionUserTypeMock,
}));

vi.mock('@utils/disciplineAdminCache', () => ({
  prefetchDisciplineAdminMap: vi.fn().mockResolvedValue(undefined),
}));

function renderPasswordReset(initialEntries = ['/password-reset']) {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ChakraProvider value={defaultSystem}>
        <Routes>
          <Route path="/password-reset" element={<PasswordReset />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe('PasswordReset', () => {
  beforeEach(() => {
    startPasswordResetMock.mockReset();
    completePasswordResetMock.mockReset();
    fetchAndStoreCurrentSessionUserTypeMock.mockReset();
    getCurrentSessionUserTypeMock.mockReset();
    getCurrentSessionUserTypeMock.mockResolvedValue(null);
  });

  it('requests a Cognito confirmation code and shows the confirmation form', async () => {
    startPasswordResetMock.mockResolvedValue({
      kind: 'CONFIRM_RESET_WITH_CODE',
      delivery: {
        destination: 'a***@example.com',
        deliveryMedium: 'EMAIL',
      },
    });

    renderPasswordReset();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Send Confirmation Code' }),
    );

    await waitFor(() => {
      expect(startPasswordResetMock).toHaveBeenCalledWith('ada@example.com');
    });
    expect(
      await screen.findByPlaceholderText('Confirmation Code'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'We sent a confirmation code by email to a***@example.com.',
      ),
    ).toBeTruthy();
  });

  it('completes the password reset and returns the user to login', async () => {
    startPasswordResetMock.mockResolvedValue({
      kind: 'CONFIRM_RESET_WITH_CODE',
      delivery: {
        destination: 'a***@example.com',
        deliveryMedium: 'EMAIL',
      },
    });
    completePasswordResetMock.mockResolvedValue(undefined);

    renderPasswordReset();

    fireEvent.change(screen.getByPlaceholderText('Email'), {
      target: { value: 'ada@example.com' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Send Confirmation Code' }),
    );

    expect(
      await screen.findByPlaceholderText('Confirmation Code'),
    ).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText('Confirmation Code'), {
      target: { value: '123456' },
    });
    fireEvent.change(screen.getByPlaceholderText('New Password'), {
      target: { value: 'BetterPass123!' },
    });
    fireEvent.change(screen.getByPlaceholderText('Confirm New Password'), {
      target: { value: 'BetterPass123!' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reset Password' }));

    await waitFor(() => {
      expect(completePasswordResetMock).toHaveBeenCalledWith(
        'ada@example.com',
        '123456',
        'BetterPass123!',
      );
    });
    expect(
      await screen.findByText(
        'Your password was reset. Sign in with your new password.',
      ),
    ).toBeTruthy();
  });
});
