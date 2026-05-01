import React from 'react';
import { Flex, Text, Box, Link } from '@chakra-ui/react';

type BaseNavbarItemProps = {
  label: string;
  icon: React.ReactNode;
};

type NavbarItemLinkProps = BaseNavbarItemProps & {
  href: string;
  onClick?: never;
};

type NavbarItemActionProps = BaseNavbarItemProps & {
  onClick: () => void | Promise<void>;
  href?: never;
};

export type NavbarItemProps = NavbarItemLinkProps | NavbarItemActionProps;

const content = (label: string, icon: React.ReactNode) => (
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
);

export default function NavBarItem({
  href,
  label,
  icon,
  onClick,
}: NavbarItemProps) {
  if (onClick) {
    return (
      <Box
        as="button"
        onClick={onClick}
        width="100%"
        textAlign="left"
        bg="transparent"
        border="none"
        p="0"
      >
        {content(label, icon)}
      </Box>
    );
  }

  return (
    <Link
      href={href}
      _focus={{ outline: 'none', boxShadow: 'none' }}
      _focusVisible={{ outline: 'none', boxShadow: 'none' }}
      _hover={{ textDecoration: 'none' }}
    >
      {content(label, icon)}
    </Link>
  );
}
