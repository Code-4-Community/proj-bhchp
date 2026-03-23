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
import { useLocation, useNavigate, Link as RouterLink } from 'react-router-dom';

import { signInWithEmailPassword } from '../auth/cognito';
import { isAuthenticated } from '../auth/cognito';

type LocationState = {
  from?: {
    pathname?: string;
  };
};

const Login: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectPath =
    (location.state as LocationState | null)?.from?.pathname ?? '/';

  useEffect(() => {
    // If the user is already authenticated, send them to the admin landing page
    isAuthenticated().then((authed) => {
      if (authed) navigate('/', { replace: true });
    });
  }, [navigate]);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);

    try {
      await signInWithEmailPassword(email.trim(), password);
      navigate(redirectPath, { replace: true });
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
