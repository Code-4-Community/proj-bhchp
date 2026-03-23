import React from 'react';
import { Box, Heading, Flex, Link, Text } from '@chakra-ui/react';
import NavbarItem from './NavBarItem';
import { FaHouse, FaPerson, FaRegFile } from 'react-icons/fa6';
import { IoIosSettings } from 'react-icons/io';
import { CgProfile } from 'react-icons/cg';
import { UserType } from '@api/types';

export type NavBarProps = {
  logo: React.ReactNode;
  userType: UserType;
};

export default function NavBar({ logo, userType }: NavBarProps) {
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
              href="#dashboard"
              label="Dashboard"
              icon={<FaHouse />}
            />
          )}
          {userType === UserType.STANDARD && (
            <NavbarItem
              href="#myapplication"
              label="My Application"
              icon={<FaPerson />}
            />
          )}
          {userType === UserType.STANDARD && (
            <NavbarItem href="#myforms" label="My Forms" icon={<FaRegFile />} />
          )}
          <NavbarItem
            href="#settings"
            label="Settings"
            icon={<IoIosSettings />}
          />
        </Flex>
      </Box>

      <Link
        href="#profile"
        width="100%"
        _hover={{ textDecoration: 'none' }}
        _focus={{ outline: 'none', boxShadow: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
      >
        <Flex
          align="center"
          gap="12px"
          padding="12px 16px"
          borderRadius="md"
          bg="#204AA0"
          cursor="pointer"
          width="100%"
        >
          <Flex
            width="32px"
            height="32px"
            borderRadius="full"
            bg="white"
            align="center"
            justify="center"
            fontSize="14px"
            color="#204AA0"
            fontWeight="bold"
          >
            <CgProfile size="20px" />
          </Flex>

          <Text fontSize="16px" fontWeight="500" color="white">
            Profile
          </Text>
        </Flex>
      </Link>
    </Box>
  );
}
