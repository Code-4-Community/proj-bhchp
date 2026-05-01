import React from 'react';
import { Box, Heading, Flex } from '@chakra-ui/react';
import NavbarItem from './NavBarItem';
import {
  FaHouse,
  FaPerson,
  FaRegFile,
  FaRightFromBracket,
  FaUserPlus,
} from 'react-icons/fa6';
import { UserType } from '@api/types';
import { signOutUser } from '../../auth/cognito';

export type NavBarProps = {
  logo: React.ReactNode;
  userType: UserType;
};

export default function NavBar({ logo, userType }: NavBarProps) {
  const handleLogout = async () => {
    try {
      await signOutUser();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Sign out failed', err);
    } finally {
      window.location.replace('/login');
    }
  };

  return (
    <Box
      display="flex"
      width="240px"
      height="100vh"
      flexDirection="column"
      justifyContent="space-between"
      alignItems="flex-start"
      flexShrink={0}
      padding="16px"
      bg="#013594"
    >
      <Box width="100%">
        <Flex justifyContent="space-between" alignItems="center">
          <Heading size="2xl" fontWeight="600" color="white" mb="24px">
            {logo}
          </Heading>
        </Flex>
        <Flex direction="column" width="100%" paddingTop="16px">
          {userType === UserType.ADMIN && (
            <NavbarItem
              href="/admin/landing"
              label="Dashboard"
              icon={<FaHouse />}
            />
          )}
          {userType === UserType.ADMIN && (
            <NavbarItem
              href="/admin/create"
              label="Create New Admin"
              icon={<FaUserPlus />}
            />
          )}
          {userType === UserType.STANDARD && (
            <NavbarItem
              href="/candidate/view-application"
              label="My Application"
              icon={<FaPerson />}
            />
          )}
          {userType === UserType.STANDARD && (
            <NavbarItem
              href="/candidate/upload-forms"
              label="My Forms"
              icon={<FaRegFile />}
            />
          )}
        </Flex>
      </Box>

      <NavbarItem
        onClick={handleLogout}
        label="Log Out"
        icon={<FaRightFromBracket />}
      />
    </Box>
  );
}
