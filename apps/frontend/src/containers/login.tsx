import {
  Alert,
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { useNavigate, Link as RouterLink } from 'react-router-dom';

import { signInWithEmailPassword, signOutUser } from '../auth/cognito';
import {
  fetchAndStoreCurrentSessionUserType,
  getCurrentSessionUserType,
} from '../auth/current-session-user-type';
import { UserType } from '@api/types';

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const landingForRole = (role: UserType): string => {
    return role === UserType.ADMIN
      ? '/admin/landing'
      : '/candidate/view-application';
  };

  useEffect(() => {
    // If the user is already signed in and we can resolve a backend userType,
    // send them to the appropriate landing page.
    console.debug('[ui] Login mount: checking existing session userType');
    getCurrentSessionUserType()
      .then((userType) => {
        console.debug('[ui] Login: getCurrentSessionUserType result', {
          userType,
        });
        if (userType) {
          navigate(landingForRole(userType), { replace: true });
        }
      })
      .catch((err) => {
        console.error('[ui] Login: error checking session userType', err);
      });
  }, [navigate]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      console.debug('[ui] Login: attempting signIn', { email });
      await signInWithEmailPassword(email.trim(), password);
      console.debug('[ui] Login: signIn succeeded, fetching backend userType');
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
      const message =
        err instanceof Error
          ? err.message
          : 'Sign in failed. Verify your credentials and try again.';
      setError(message);
      // Helpful for debugging Cognito errors (e.g. secret hash / unconfirmed user)
      console.error('Cognito sign-in failed:', err);
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
            <Text>
              <RouterLink to="/signup">Create an account</RouterLink>
            </Text>
          </Stack>
        </Box>
      </form>
    </Box>
  );
};

export default Login;
