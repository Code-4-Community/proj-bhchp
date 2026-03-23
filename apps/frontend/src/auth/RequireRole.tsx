import { Box, Spinner } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';

import { getCurrentSessionUserType } from './current-session-user-type';
import { UserType } from '@api/types';

type RequireRoleProps = {
  allowedRoles: UserType[];
};

const landingForRole = (role: UserType): string => {
  return role === UserType.ADMIN
    ? '/admin/landing'
    : '/candidate/view-application';
};

const RequireRole: React.FC<RequireRoleProps> = ({ allowedRoles }) => {
  const [checked, setChecked] = useState(false);
  const [role, setRole] = useState<UserType | null>(null);

  useEffect(() => {
    getCurrentSessionUserType()
      .then((r) => setRole(r))
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

  if (!role) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(role)) {
    return <Navigate to={landingForRole(role)} replace />;
  }

  return <Outlet />;
};

export default RequireRole;
