import {
  Alert,
  Box,
  Button,
  Heading,
  Input,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { signUpWithEmailPassword } from '../auth/cognito';

const Signup: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await signUpWithEmailPassword(email.trim(), password);
      setSuccess('Sign up successful.');
      setTimeout(() => navigate('/login', { replace: true }), 1500);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : String(err) || 'Sign up failed';
      setError(message);
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
      <form onSubmit={onSubmit} style={{ width: '100%', maxWidth: '480px' }}>
        <Box w="100%" p="8" borderWidth="1px" borderRadius="md">
          <Stack gap="4">
            <Heading size="lg">Create account</Heading>
            <Text color="gray.600">Create a Cognito account to sign in.</Text>

            {error ? <Alert.Root status="error">{error}</Alert.Root> : null}
            {success ? (
              <Alert.Root status="success">{success}</Alert.Root>
            ) : null}
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" loading={loading} colorPalette="blue">
              Sign Up
            </Button>
          </Stack>
        </Box>
      </form>
    </Box>
  );
};

export default Signup;
