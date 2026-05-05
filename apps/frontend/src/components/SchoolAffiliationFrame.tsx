import { useEffect, useState } from 'react';
import { Button, Circle, Flex, Heading, Input, Text } from '@chakra-ui/react';
import { normalizeDateToDay } from '@utils/applicationFilters';

export interface SchoolAffiliationProps {
  schoolName: string;
  schoolDepartment: string;
  license: string;
  desiredExperience: string;
  areaOfInterest: string;
  proposedStartDate: string;
  actualStartDate?: string;
  endDate?: string;
  totalTimeRequested: string;
  isLearner?: boolean;
  canEditDates?: boolean;
  canEditActualStartDate?: boolean;
  onUpdateProposedStartDate?: (value: string) => Promise<void>;
  onUpdateActualStartDate?: (value: string) => Promise<void>;
  onUpdateEndDate?: (value: string) => Promise<void>;
}

const SchoolAffiliationFrame = ({
  schoolName,
  schoolDepartment,
  license,
  desiredExperience,
  areaOfInterest,
  proposedStartDate,
  actualStartDate,
  endDate,
  totalTimeRequested,
  isLearner = true,
  canEditDates = false,
  canEditActualStartDate = false,
  onUpdateProposedStartDate,
  onUpdateActualStartDate,
  onUpdateEndDate,
}: SchoolAffiliationProps) => {
  const normalizedProposed = normalizeDateToDay(proposedStartDate) ?? '';
  const normalizedActual = normalizeDateToDay(actualStartDate) ?? '';
  const normalizedEnd = normalizeDateToDay(endDate) ?? '';

  const [proposedValue, setProposedValue] = useState(normalizedProposed);
  const [actualValue, setActualValue] = useState(normalizedActual);
  const [endValue, setEndValue] = useState(normalizedEnd);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) return;

    setProposedValue(normalizedProposed);
    setActualValue(normalizedActual);
    setEndValue(normalizedEnd);
  }, [isEditing, normalizedProposed, normalizedActual, normalizedEnd]);

  const proposedChanged = proposedValue !== normalizedProposed;
  const actualChanged = actualValue !== normalizedActual;
  const endChanged = endValue !== normalizedEnd;
  const canSave =
    (canEditDates || canEditActualStartDate) &&
    isEditing &&
    !saving &&
    (proposedChanged || actualChanged || endChanged) &&
    (!proposedChanged || proposedValue) &&
    (!actualChanged || actualValue) &&
    (!endChanged || endValue);

  const formatDate = (value?: string): string => {
    const normalized = normalizeDateToDay(value);
    if (!normalized) return '-';
    const [year, month, day] = normalized.split('-');
    return `${month}/${day}/${year}`;
  };

  const handleSaveDates = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      if (proposedChanged && onUpdateProposedStartDate) {
        await onUpdateProposedStartDate(proposedValue);
      }
      if (actualChanged && onUpdateActualStartDate) {
        await onUpdateActualStartDate(actualValue);
      }
      if (endChanged && onUpdateEndDate) {
        await onUpdateEndDate(endValue);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update dates:', err);
      setError('Failed to update dates');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelDates = () => {
    setProposedValue(normalizedProposed);
    setActualValue(normalizedActual);
    setEndValue(normalizedEnd);
    setError(null);
    setIsEditing(false);
  };

  return (
    <Flex
      direction="column"
      w="100%"
      minH="277px"
      p={{ base: '20px', md: '24px 48px' }}
      gap="21px"
      bg="#F5F5F5"
      boxSizing="border-box"
      mb="24px"
      pb={{ base: '300px', md: '300px' }}
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
                Desired Experience:{' '}
                <Text as="span" fontWeight="normal">
                  {desiredExperience}
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
            <Text fontSize="sm" fontWeight="bold">
              Desired Experience:{' '}
              <Text as="span" fontWeight="normal">
                {desiredExperience}
              </Text>
            </Text>
          </Flex>
        )}

        {/* Time Column */}
        <Flex direction="column" gap="3" flex="1">
          <Flex align="center" justify="space-between" gap="3" wrap="wrap">
            <Heading as="h2" size="md">
              Time
            </Heading>
            {(canEditDates || canEditActualStartDate) && (
              <Flex align="center" gap="2" wrap="wrap">
                {isEditing ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCancelDates}
                      disabled={saving}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      colorPalette="blue"
                      onClick={handleSaveDates}
                      loading={saving}
                      disabled={!canSave}
                    >
                      Save
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setIsEditing(true);
                      setError(null);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Flex>
            )}
          </Flex>
          {error && (
            <Text fontSize="sm" color="red.500">
              {error}
            </Text>
          )}
          <Flex align="center" justify="space-between" gap="3" wrap="wrap">
            <Text fontSize="sm" fontWeight="bold">
              Proposed Start Date:
            </Text>
            {canEditDates && isEditing ? (
              <Input
                type="date"
                size="sm"
                maxW="200px"
                value={proposedValue}
                onChange={(event) => setProposedValue(event.target.value)}
              />
            ) : (
              <Text fontSize="sm" fontWeight="normal">
                {formatDate(proposedStartDate)}
              </Text>
            )}
          </Flex>
          <Flex align="center" justify="space-between" gap="3" wrap="wrap">
            <Text fontSize="sm" fontWeight="bold">
              Actual Start Date:
            </Text>
            {canEditActualStartDate && isEditing ? (
              <Input
                type="date"
                size="sm"
                maxW="200px"
                value={actualValue}
                onChange={(event) => setActualValue(event.target.value)}
              />
            ) : (
              <Text fontSize="sm" fontWeight="normal">
                {formatDate(actualStartDate)}
              </Text>
            )}
          </Flex>
          <Flex align="center" justify="space-between" gap="3" wrap="wrap">
            <Text fontSize="sm" fontWeight="bold">
              End Date:
            </Text>
            {canEditDates && isEditing ? (
              <Input
                type="date"
                size="sm"
                maxW="200px"
                value={endValue}
                onChange={(event) => setEndValue(event.target.value)}
              />
            ) : (
              <Text fontSize="sm" fontWeight="normal">
                {formatDate(endDate)}
              </Text>
            )}
          </Flex>
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
