import {
  Alert,
  Box,
  Button,
  Heading,
  Input,
  Link,
  Stack,
  Text,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { Link as RouterLink, useLocation, useNavigate } from 'react-router-dom';

import {
  completePasswordReset,
  startPasswordReset,
  type PasswordResetDeliveryDetails,
} from '../auth/cognito';

type PasswordResetLocationState = {
  email?: string;
};

const getDeliveryMessage = (
  delivery: PasswordResetDeliveryDetails | null,
): string => {
  if (!delivery) {
    return 'Check your email for the confirmation code, then enter it below.';
  }

  const medium = delivery.deliveryMedium?.toLowerCase();
  const destination = delivery.destination;

  if (medium && destination) {
    return `We sent a confirmation code by ${medium} to ${destination}.`;
  }

  if (destination) {
    return `We sent a confirmation code to ${destination}.`;
  }

  return 'Check your email for the confirmation code, then enter it below.';
};

const PasswordReset: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = (location.state as PasswordResetLocationState) ?? {};

  const [email, setEmail] = useState(locationState.email ?? '');
  const [confirmationCode, setConfirmationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [deliveryDetails, setDeliveryDetails] =
    useState<PasswordResetDeliveryDetails | null>(null);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const deliveryMessage = useMemo(
    () => getDeliveryMessage(deliveryDetails),
    [deliveryDetails],
  );

  const onRequestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await startPasswordReset(email.trim());

      if (result.kind === 'DONE') {
        setSuccessMessage(
          'Your password reset is already complete. You can sign in now.',
        );
        setIsCodeSent(false);
        return;
      }

      const nextDelivery = result.delivery ?? null;
      setDeliveryDetails(nextDelivery);
      setIsCodeSent(true);
      setSuccessMessage(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Unable to send a password reset code.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const onConfirmReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setError('New password and confirmation must match.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      await completePasswordReset(
        email.trim(),
        confirmationCode.trim(),
        newPassword,
      );
      navigate('/login', {
        replace: true,
        state: {
          passwordResetSuccess: true,
          email: email.trim(),
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Unable to reset your password.';
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
      <form
        onSubmit={isCodeSent ? onConfirmReset : onRequestCode}
        style={{ width: '100%', maxWidth: '420px' }}
      >
        <Box w="100%" p="8" borderWidth="1px" borderRadius="md">
          <Stack gap="4">
            <Heading size="lg">Reset Your Password</Heading>
            <Text color="gray.600">
              {!isCodeSent
                ? 'Enter your email and we will send a confirmation code through Cognito.'
                : 'Enter the confirmation code and choose a new password.'}
            </Text>

            {error ? (
              <Alert.Root status="error">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{error}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            {successMessage ? (
              <Alert.Root status="success">
                <Alert.Indicator />
                <Alert.Content>
                  <Alert.Description>{successMessage}</Alert.Description>
                </Alert.Content>
              </Alert.Root>
            ) : null}

            <Input
              type="email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              required
              autoComplete="email"
              disabled={loading || isCodeSent}
            />

            {isCodeSent ? (
              <>
                {deliveryMessage ? (
                  <Text fontSize="sm" color="gray.600">
                    {deliveryMessage}
                  </Text>
                ) : null}

                <Input
                  name="confirmationCode"
                  value={confirmationCode}
                  onChange={(e) => setConfirmationCode(e.target.value)}
                  placeholder="Confirmation Code"
                  required
                  autoComplete="one-time-code"
                />

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
                  Reset Password
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsCodeSent(false);
                    setConfirmationCode('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setDeliveryDetails(null);
                    setSuccessMessage(null);
                    setError(null);
                  }}
                  disabled={loading}
                >
                  Start Over
                </Button>
              </>
            ) : (
              <Button type="submit" loading={loading} colorPalette="blue">
                Send Confirmation Code
              </Button>
            )}

            <Link asChild alignSelf="flex-start" color="blue.600">
              <RouterLink to="/login">Back to sign in</RouterLink>
            </Link>
          </Stack>
        </Box>
      </form>
    </Box>
  );
};

export default PasswordReset;
