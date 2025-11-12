import React from 'react';
import { Box, Heading, Text, Flex } from '@chakra-ui/react';

interface StatisticsCardProps {
  title: string;
  count: number;
  description: string;
  icon: React.ReactNode;
}

const StatisticsCard: React.FC<StatisticsCardProps> = ({
  title,
  count,
  description,
  icon,
}) => {
  return (
    <Box
      borderWidth="2px"
      borderColor="black"
      borderRadius="16px"
      padding="16px"
      bg="white"
      width="250px"
      height="158px"
      display="flex"
      flexDirection="column"
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        mb="20px"
        px="16px"
      >
        <Heading as="h3" size="md" fontWeight="400" color="black">
          {title}
        </Heading>
        <Flex
          alignItems="center"
          justifyContent="center"
          width="24px"
          height="24px"
          borderRadius="full"
          bg="#204AA0"
          color="white"
        >
          {icon}
        </Flex>
      </Flex>
      <Text fontSize="20px" fontWeight="700" mb="20px" color="black" px="16px">
        {count}
      </Text>
      <Text fontSize="16px" fontWeight="400" color="black" px="16px">
        {description}
      </Text>
    </Box>
  );
};

export default StatisticsCard;
