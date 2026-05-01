import { Box, Flex, Text } from '@chakra-ui/react';
import React from 'react';
import type { ReactNode } from 'react';

interface ApplicationProfileHeaderProps {
  firstName: string;
  lastName: string;
  pronouns?: string;
  discipline?: string;
  email?: string;
  phone?: string;
  over18?: boolean;
  statusControl?: ReactNode;
}

const ApplicationProfileHeader: React.FC<ApplicationProfileHeaderProps> = ({
  firstName,
  lastName,
  pronouns,
  discipline,
  email,
  phone,
  over18,
  statusControl,
}) => {
  return (
    <Box display="flex" flexDirection="column" gap="4">
      <Box
        position="relative"
        color="white"
        p="6"
        display="flex"
        alignItems="center"
        gap="6"
        pt="20"
        pl="5"
        mt="-10"
        ml="-10"
        mr="-20"
        bg="#013594"
      >
        <Box
          position="absolute"
          bottom="-48px"
          left="35px"
          zIndex="2"
          w="96px"
          h="96px"
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          flexShrink={0}
          color="white"
          bg="#013594"
          borderWidth="5px"
          borderColor="white"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="56"
            height="56"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
          </svg>
        </Box>
        <Text textStyle="4xl" textTransform="capitalize" pl="130px" pb="3">
          {firstName} {lastName}
        </Text>
      </Box>

      <Box
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderBottomRadius="md"
        display="flex"
        flexDirection="column"
        gap="2"
        fontSize="sm"
        p="6"
        pl="110px"
      >
        <Flex align="center" gap="6">
          <Box flex="1">
            <div>
              <Text as="span" fontWeight="semibold">
                Pronouns:
              </Text>{' '}
              {pronouns ?? 'N/A'}
            </div>
            <div>
              <Text as="span" fontWeight="semibold">
                Discipline:
              </Text>{' '}
              {discipline ?? 'N/A'}
            </div>
            <div>
              <Text as="span" fontWeight="semibold">
                Email:
              </Text>{' '}
              {email ?? 'N/A'}
            </div>
            <div>
              <Text as="span" fontWeight="semibold">
                Phone:
              </Text>{' '}
              {phone ?? 'N/A'}
            </div>
            <div>
              <Text as="span" fontWeight="semibold">
                Over 18?
              </Text>{' '}
              <Text
                display="inline-block"
                px="3"
                py="1"
                fontSize="sm"
                borderRadius="full"
                fontWeight="semibold"
                color="white"
                bg={over18 === false ? 'red.500' : 'green.500'}
              >
                {over18 === false ? 'No' : 'Yes'}
              </Text>
            </div>
          </Box>

          {statusControl && (
            <Box flexShrink={0} display="flex" alignItems="center" mr="20">
              {statusControl}
            </Box>
          )}
        </Flex>
      </Box>
    </Box>
  );
};

export default ApplicationProfileHeader;
