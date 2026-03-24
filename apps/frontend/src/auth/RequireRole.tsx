import { Box, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { getCurrentSessionUserType } from './current-session-user-type';
import { UserType } from '../api/types';

type RequireRoleProps = {
  allowedUserTypes: UserType[];
};

const landingForUserType = (userType: UserType): string => {
  return userType === UserType.ADMIN
    ? '/admin/landing'
    : '/candidate/view-application';
};

const RequireRole: React.FC<RequireRoleProps> = ({ allowedUserTypes }) => {
  const [checked, setChecked] = useState(false);
  const [userType, setUserType] = useState<UserType | null>(null);

  useEffect(() => {
    getCurrentSessionUserType()
      .then((resolvedUserType) => setUserType(resolvedUserType))
      .finally(() => setChecked(true));
  }, []);

  if (!checked) {
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

  if (!userType) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedUserTypes.includes(userType)) {
    return <Navigate to={landingForUserType(userType)} replace />;
  }

  return <Outlet />;
};

export default RequireRole;
