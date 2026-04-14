import { Flex, Heading, Text, Circle } from '@chakra-ui/react';

export interface SchoolAffiliationProps {
  schoolName: string;
  schoolDepartment: string;
  license: string;
  areaOfInterest: string;
  proposedStartDate: string;
  actualStartDate: string;
  endDate: string;
  totalTimeRequested: string;
  isLearner?: boolean;
}

const SchoolAffiliationFrame = ({
  schoolName,
  schoolDepartment,
  license,
  areaOfInterest,
  proposedStartDate,
  actualStartDate,
  endDate,
  totalTimeRequested,
  isLearner = true,
}: SchoolAffiliationProps) => {
  return (
    <Flex
      direction="column"
      w="100%"
      minH="277px"
      p={{ base: '16px', md: '20px 40px' }}
      gap="21px"
      bg="#F5F5F5"
      boxSizing="border-box"
      mb="24px"
    >
      <Flex
        justify="space-between"
        align={{ base: 'flex-start', lg: 'center' }}
        gap="4"
        wrap="wrap"
      >
        <Heading as="h1" size="xl" mb="2">
          {isLearner ? 'School Affiliation' : 'Additional Information'}
        </Heading>
      </Flex>

      <Flex
        direction={{ base: 'column', lg: 'row' }}
        gap={{ base: '8', lg: '16' }}
        align={{ base: 'flex-start', lg: 'flex-start' }}
      >
        {isLearner ? (
          <>
            <Circle size="120px" bg="gray.300" flexShrink={0}>
              {/* Placeholder for University Logo */}
            </Circle>

            {/* University Column */}
            <Flex direction="column" gap="3" flex="1">
              <Heading as="h3" size="md" pb="3">
                {schoolName}
              </Heading>

              <Text fontSize="sm" fontWeight="bold">
                School Department:{' '}
                <Text as="span" fontWeight="normal">
                  {schoolDepartment}
                </Text>
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                License:{' '}
                <Text as="span" fontWeight="normal">
                  {license}
                </Text>
              </Text>
              <Text fontSize="sm" fontWeight="bold">
                Area of Interest:{' '}
                <Text as="span" fontWeight="normal">
                  {areaOfInterest}
                </Text>
              </Text>
            </Flex>
          </>
        ) : (
          <Flex direction="column" gap="3" flex="1">
            <Heading as="h2" size="md" pb="3">
              Interest and Licensing
            </Heading>
            <Text fontSize="sm" fontWeight="bold">
              Area of Interest:{' '}
              <Text as="span" fontWeight="normal">
                {areaOfInterest}
              </Text>
            </Text>
            <Text fontSize="sm" fontWeight="bold">
              License:{' '}
              <Text as="span" fontWeight="normal">
                {license}
              </Text>
            </Text>
          </Flex>
        )}

        {/* Time Column */}
        <Flex direction="column" gap="3" flex="1">
          <Heading as="h2" size="md" mb="3">
            Time
          </Heading>

          <Text fontSize="sm" fontWeight="bold">
            Proposed Start Date:{' '}
            <Text as="span" fontWeight="normal">
              {proposedStartDate || '-'}
            </Text>
          </Text>
          <Text fontSize="sm" fontWeight="bold">
            Actual Start Date:{' '}
            <Text as="span" fontWeight="normal">
              {actualStartDate || '-'}
            </Text>
          </Text>
          <Text fontSize="sm" fontWeight="bold">
            End Date:{' '}
            <Text as="span" fontWeight="normal">
              {endDate || '-'}
            </Text>
          </Text>
          <Text fontSize="sm" fontWeight="bold">
            Total Time Requested:{' '}
            <Text as="span" fontWeight="normal">
              {totalTimeRequested}
            </Text>
          </Text>
        </Flex>
      </Flex>
    </Flex>
  );
};

export default SchoolAffiliationFrame;
