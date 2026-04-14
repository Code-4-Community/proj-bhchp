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
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import { signInWithEmailPassword, signOutUser } from '../auth/cognito';
import {
  fetchAndStoreCurrentSessionUserType,
  getCurrentSessionUserType,
} from '../auth/current-session-user-type';
import { UserType } from '../api/types';

/**
 * Sign-in screen that authenticates with Cognito and resolves backend role
 * data for app-specific routing.
 */
const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const landingForUserType = useCallback((userType: UserType): string => {
    return userType === UserType.ADMIN
      ? '/admin/landing'
      : '/candidate/view-application';
  }, []);

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
      await signInWithEmailPassword(email.trim(), password);
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
      console.debug('[ui] Login: signIn succeeded, fetching backend userType');
      // Cognito confirms the identity here; the backend determines whether
      // that identity maps to an ADMIN or STANDARD user in this app.
      const userType = await fetchAndStoreCurrentSessionUserType();

      console.debug(
        '[ui] Login: fetchAndStoreCurrentSessionUserType returned',
        { userType },
      );

      if (!userType) {
        await signOutUser();
        setError('Unable to determine the account type for this user.');
        return;
      }

      navigate('/', { replace: true });
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

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      px="4"
    >
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: '420px' }}>
        <Box w="100%" p="8" borderWidth="1px" borderRadius="md">
          <Stack gap="4">
            <Heading size="lg">Sign In</Heading>
            <Text color="gray.600">Use your Cognito account to continue.</Text>

            {error ? <Alert.Root status="error">{error}</Alert.Root> : null}

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
          </Stack>
        </Box>
      </form>
    </Box>
  );
};

export default Login;
