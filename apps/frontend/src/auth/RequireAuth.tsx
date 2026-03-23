import { Box, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { isAuthenticated } from './cognito';

const RequireAuth: React.FC = () => {
  const location = useLocation();
  const [authChecked, setAuthChecked] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    isAuthenticated()
      .then((result) => setAuthed(result))
      .finally(() => setAuthChecked(true));
  }, []);

  if (!authChecked) {
    return (
      <Box
        display="flex"
        minH="100vh"
        alignItems="center"
        justifyContent="center"
      >
        <Spinner size="xl" />
      </Box>
    );
  }

  if (!authed) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return <Outlet />;
};

export default RequireAuth;
