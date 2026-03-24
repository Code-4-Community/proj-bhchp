import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Button, Heading, Stack, Text } from '@chakra-ui/react';

import { signOutUser } from '../auth/cognito';

const Logout: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await signOutUser();
    } catch (err) {
      // swallow — still navigate to login
      // eslint-disable-next-line no-console
      console.error('Sign out failed', err);
    } finally {
      setLoading(false);
      navigate('/login', { replace: true });
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
      <Box w="100%" maxW="420px" p="8" borderWidth="1px" borderRadius="md">
        <Stack gap="4">
          <Heading size="lg">Sign Out</Heading>
          <Text color="gray.600">Click the button below to sign out.</Text>
          <Button loading={loading} colorPalette="red" onClick={handleLogout}>
            Sign Out
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default Logout;
