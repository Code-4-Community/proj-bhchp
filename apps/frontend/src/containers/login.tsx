import {
  Alert,
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

import {
  confirmSignInWithNewPassword,
  signInWithEmailPassword,
  signOutUser,
} from '../auth/cognito';
import {
  fetchAndStoreCurrentSessionUserType,
  getCurrentSessionUserType,
} from '../auth/current-session-user-type';
import { UserType } from '../api/types';
import { prefetchDisciplineAdminMap } from '@utils/disciplineAdminCache';

/**
 * Sign-in screen that authenticates with Cognito and resolves backend role
 * data for app-specific routing.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewPasswordRequired, setIsNewPasswordRequired] = useState(false);

  const landingForUserType = useCallback((userType: UserType): string => {
    return userType === UserType.ADMIN
      ? '/admin/landing'
      : '/candidate/view-application';
  }, []);

  const completeBackendRoleResolution = useCallback(async (): Promise<void> => {
    console.debug('[ui] Login: resolving backend userType after Cognito auth');
    const userType = await fetchAndStoreCurrentSessionUserType();

    console.debug('[ui] Login: fetchAndStoreCurrentSessionUserType returned', {
      userType,
    });

    if (!userType) {
      await signOutUser();
      throw new Error('Unable to determine the account type for this user.');
    }

    if (userType === UserType.ADMIN) {
      void prefetchDisciplineAdminMap().catch((error) => {
        console.warn('[ui] Login: discipline admin map prefetch failed', error);
      });
    }

    navigate('/', { replace: true });
  }, [navigate]);

  useEffect(() => {
    // If an existing session already has a backend userType cached, send the user
    // straight to the correct landing page instead of showing the login form.
    console.debug('[ui] Login mount: checking existing session userType');
    getCurrentSessionUserType()
      .then((userType) => {
        console.debug('[ui] Login: getCurrentSessionUserType result', {
          userType,
        });
        if (userType) {
          navigate(landingForUserType(userType), { replace: true });
        }
      })
      .catch((err) => {
        console.error('[ui] Login: error checking session userType', err);
      });
  }, [navigate, landingForUserType]);

  /**
   * Handles sign-in and backend role lookup for the authenticated session.
   *
   * @param event Form submit event from the login form.
   */
  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      console.debug('[ui] Login: attempting signIn', { email });
      const signInResult = await signInWithEmailPassword(
        email.trim(),
        password,
      );

      if (signInResult.kind === 'NEW_PASSWORD_REQUIRED') {
        console.debug(
          '[ui] Login: Cognito requires a new password before routing',
        );
        setIsNewPasswordRequired(true);
        setLoading(false);
        return;
      }

      if (signInResult.kind === 'UNSUPPORTED_CHALLENGE') {
        console.error('[ui] Login: unsupported Cognito sign-in challenge', {
          signInStep: signInResult.signInStep,
        });
        setError(
          signInResult.signInStep
            ? `This sign-in flow requires an unsupported challenge (${signInResult.signInStep}).`
            : 'This sign-in flow requires an unsupported Cognito challenge.',
        );
        setLoading(false);
        return;
      }
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Sign in failed. Verify your credentials and try again.';
      setError(message);
      console.error('Cognito sign-in failed:', err);
      setLoading(false);
      return;
    }

    try {
      await completeBackendRoleResolution();
    } catch (err: unknown) {
      await signOutUser().catch(() => undefined);

      const status =
        typeof err === 'object' && err !== null && 'response' in err
          ? (err as { response?: { status?: number } }).response?.status
          : undefined;

      setError(
        status === 403
          ? 'This Cognito account is authenticated, but no BHCHP user record exists yet.'
          : 'Unable to determine the account type for this user.',
      );
      console.error('[ui] Login: backend user lookup failed', err);
    } finally {
      setLoading(false);
    }
  };

  const onNewPasswordSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation must match.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await confirmSignInWithNewPassword(newPassword);
      await completeBackendRoleResolution();
    } catch (err: unknown) {
      await signOutUser().catch(() => undefined);
      setIsNewPasswordRequired(false);

      const message =
        err instanceof Error
          ? err.message
          : 'Unable to finish setting the new password.';
      setError(message);
      console.error('[ui] Login: new-password challenge failed', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px="4"
    >
      <form
        onSubmit={isNewPasswordRequired ? onNewPasswordSubmit : onSubmit}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        <Box w="100%" p="8" borderWidth="1px" borderRadius="md">
          <Stack gap="4">
            <Heading size="lg">
              {isNewPasswordRequired ? 'Set Your Password' : 'Sign In'}
            </Heading>
            <Text color="gray.600">
              {isNewPasswordRequired
                ? 'Create a new password to finish signing in with your invited admin account.'
                : 'Use your Cognito account to continue.'}
            </Text>

            {error ? (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            {!isNewPasswordRequired ? (
              <>
                <Input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email"
                  required
                  autoComplete="email"
                />

                <Input
                  type="password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  autoComplete="current-password"
                />

                <Button type="submit" loading={loading} colorPalette="blue">
                  Sign In
                </Button>
              </>
            ) : (
              <>
                <Input
                  type="password"
                  name="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New Password"
                  required
                  autoComplete="new-password"
                />

                <Input
                  type="password"
                  name="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Confirm New Password"
                  required
                  autoComplete="new-password"
                />

                <Button type="submit" loading={loading} colorPalette="blue">
                  Set Password
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </form>
    </Box>
  );
};

export default Login;
