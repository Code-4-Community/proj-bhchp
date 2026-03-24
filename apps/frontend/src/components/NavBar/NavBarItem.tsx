import React from 'react';
import { Flex, Text, Box, Link } from '@chakra-ui/react';
import { Link as RouterLink } from 'react-router-dom';

export type NavbarItemProps = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export default function NavBarItem({ href, label, icon }: NavbarItemProps) {
  const isInternal = href && href.startsWith('/');

  return (
    <Link
      as={isInternal ? RouterLink : undefined}
      {...(isInternal ? { to: href } : { href })}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      _focusVisible={{ outline: 'none', boxShadow: 'none' }}
      _hover={{ textDecoration: 'none' }}
    >
      <Flex
        align="center"
        gap="18px"
        padding="16px 4px"
        borderRadius="md"
        cursor="pointer"
        fontWeight="400"
        color="white"
        _focus={{ outline: 'none', boxShadow: 'none' }}
        _focusVisible={{ outline: 'none', boxShadow: 'none' }}
      >
        <Box fontSize="18px">{icon}</Box>

        <Text fontSize="14px" fontWeight="500">
          {label}
        </Text>
      </Flex>
    </Link>
  );
}
