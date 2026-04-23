import React from 'react';
import { Card, Flex, Text, Box, Image } from '@chakra-ui/react';

export type DashboardCardProps = {
  className?: string;
  description: string;
  icon: string;
  title: string;
  value: number;
  color: string;
};

export default function DashboardCard({
  title,
  value,
  description,
  icon,
  className,
  color,
}: DashboardCardProps) {
  return (
    <Card.Root
      borderRadius="18px"
      borderWidth="2px"
      borderColor="black"
      bg={color}
      pl={3}
      pr={3}
      className={className}
    >
      <Card.Body>
        <Flex justify="space-between" align="flex-start" mb={4}>
          <Text fontSize="l" fontWeight="normal" lineHeight="1.3" maxW="70%">
            {title}
          </Text>
          <Box flexShrink={0}>
            <Image
              src={icon}
              alt={`${title} icon`}
              width="22px"
              height="22px"
            />
          </Box>
        </Flex>

        <Text fontSize="xl" fontWeight="bold" mb={4}>
          {value}
        </Text>

        <Text fontSize="l" fontWeight="normal">
          {description}
        </Text>
      </Card.Body>
    </Card.Root>
  );
}
