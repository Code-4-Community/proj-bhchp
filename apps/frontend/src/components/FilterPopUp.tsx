import { useState } from 'react';
import {
  Popover,
  Button,
  Portal,
  Stack,
  Input,
  Box,
  Text,
  Flex,
  Collapsible,
  Checkbox,
  CheckboxGroup,
  Fieldset,
  For,
} from '@chakra-ui/react';
import StatusPill, { StatusPillConfig, StatusVariant } from './StatusPill';

export const DISCIPLINE_VALUES = [
  'MD/Medical Student/Pre-Med',
  'Medical NP/PA',
  'Psychiatry or Psychiatric NP/PA',
  'Public Health',
  'RN',
  'Social Work',
  'Other',
] as const;

export const STATUS_OPTIONS = Object.entries(StatusPillConfig).map(
  ([value, config]) => ({
    value: value as StatusVariant,
    label: config.label,
  }),
);

interface FilterPopUpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const FilterPopUp = ({ open, onOpenChange }: FilterPopUpProps) => {
  const [selectedDISCIPLINE_VALUES, setSelectedDISCIPLINE_VALUES] = useState<
    string[]
  >([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [proposedStartDate, setProposedStartDate] = useState('');
  const [actualStartDate, setActualStartDate] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([
    'Proposed Start Date',
    'Actual Start Date',
    'Discipline',
    'Discipline Admin Name',
    'Status',
  ]);

  const totalFilters =
    selectedDISCIPLINE_VALUES.length +
    selectedStatuses.length +
    (proposedStartDate ? 1 : 0) +
    (actualStartDate ? 1 : 0);

  const toggleSection = (category: string) => {
    setOpenSections((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  };

  const filterCategories = [
    'Proposed Start Date',
    'Actual Start Date',
    'Discipline',
    'Discipline Admin Name',
    'Status',
  ];

  const getSectionFilterCount = (category: string) => {
    if (category === 'Proposed Start Date') {
      return proposedStartDate ? 1 : 0;
    }

    if (category === 'Actual Start Date') {
      return actualStartDate ? 1 : 0;
    }

    if (category === 'Discipline') {
      return selectedDISCIPLINE_VALUES.length;
    }

    if (category === 'Status') {
      return selectedStatuses.length;
    }

    return 0;
  };

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => onOpenChange?.(details.open)}
    >
      <Popover.Trigger asChild>
        <Button
          bg="#013594"
          color="white"
          _hover={{ bg: '#102660' }}
          borderRadius="md"
          px="4"
          py="2"
          h="44px"
          display="flex"
          alignItems="center"
          gap="3"
        >
          <Text fontSize="md" fontWeight="medium">
            Filters
          </Text>
          <Flex
            align="center"
            justify="center"
            bg="white"
            color="#013594"
            borderRadius="full"
            w="24px"
            h="24px"
            fontSize="sm"
            fontWeight="bold"
          >
            {totalFilters}
          </Flex>
        </Button>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content
            w="320px"
            p="0"
            overflow="hidden"
            borderRadius="md"
            boxShadow="xl"
            bg="white"
            h="420px"
            display="flex"
            flexDirection="column"
          >
            <Popover.Body
              p="0"
              display="flex"
              flexDirection="column"
              flex="1"
              overflow="hidden"
            >
              {/* Search */}
              <Box
                p="4"
                borderBottom="1px solid"
                borderColor="gray.200"
                flexShrink="0"
              >
                <Text fontSize="xl" fontWeight="bold" mb="3" color="gray.800">
                  Filter
                </Text>
                <Box position="relative">
                  <Input
                    placeholder="Search"
                    bg="white"
                    borderRadius="md"
                    pr="10"
                    borderColor="gray.300"
                    _focus={{
                      borderColor: '#173685',
                      boxShadow: '0 0 0 1px #173685',
                    }}
                  />
                </Box>
              </Box>

              {/* Filter Sections */}
              <Box overflowY="auto" flexGrow="1" minH="0">
                {filterCategories.map((category) => {
                  const isOpen = openSections.includes(category);
                  const sectionFilterCount = getSectionFilterCount(category);

                  return (
                    <Collapsible.Root
                      key={category}
                      open={isOpen}
                      onOpenChange={() => toggleSection(category)}
                    >
                      <Collapsible.Trigger asChild>
                        <Flex
                          w="full"
                          px="4"
                          py="3"
                          align="center"
                          gap="2"
                          cursor="pointer"
                          borderBottom="1px solid"
                          borderColor="gray.100"
                          bg="#173685"
                          color="white"
                        >
                          {/* Caret dropdown */}
                          <Box
                            transform={
                              isOpen ? 'rotate(90deg)' : 'rotate(0deg)'
                            }
                            transition="transform 0.2s"
                            fontSize="md"
                          >
                            ▸
                          </Box>
                          <Text
                            fontSize="sm"
                            fontWeight={isOpen ? 'medium' : 'normal'}
                            flex="1"
                          >
                            {category}
                          </Text>
                          {sectionFilterCount > 0 && (
                            <Flex
                              align="center"
                              justify="center"
                              bg="white"
                              color="#173685"
                              borderRadius="full"
                              minW="24px"
                              h="24px"
                              px="2"
                              fontSize="sm"
                              fontWeight="bold"
                            >
                              {sectionFilterCount}
                            </Flex>
                          )}
                        </Flex>
                      </Collapsible.Trigger>

                      <Collapsible.Content>
                        <Box
                          bg="white"
                          p="4"
                          borderBottom="1px solid"
                          borderColor="gray.100"
                        >
                          {category === 'Proposed Start Date' ||
                          category === 'Actual Start Date' ? (
                            <Stack gap="3">
                              <Input
                                placeholder="MM-DD-YYYY"
                                type="text"
                                bg="white"
                                borderRadius="md"
                                borderColor="gray.300"
                                value={
                                  category === 'Proposed Start Date'
                                    ? proposedStartDate
                                    : actualStartDate
                                }
                                onChange={(e) =>
                                  category === 'Proposed Start Date'
                                    ? setProposedStartDate(e.target.value)
                                    : setActualStartDate(e.target.value)
                                }
                                _focus={{
                                  borderColor: '#173685',
                                  boxShadow: '0 0 0 1px #173685',
                                }}
                              />
                            </Stack>
                          ) : category === 'Discipline' ? (
                            <Stack gap="3">
                              <Fieldset.Root>
                                <CheckboxGroup
                                  name="DISCIPLINE_VALUES"
                                  value={selectedDISCIPLINE_VALUES}
                                  onValueChange={setSelectedDISCIPLINE_VALUES}
                                >
                                  <Fieldset.Content>
                                    <For each={DISCIPLINE_VALUES}>
                                      {(value) => (
                                        <Checkbox.Root
                                          key={value}
                                          value={value}
                                        >
                                          <Checkbox.HiddenInput />
                                          <Checkbox.Control />
                                          <Checkbox.Label>
                                            {value}
                                          </Checkbox.Label>
                                        </Checkbox.Root>
                                      )}
                                    </For>
                                  </Fieldset.Content>
                                </CheckboxGroup>
                              </Fieldset.Root>
                            </Stack>
                          ) : category === 'Status' ? (
                            <Stack gap="3">
                              <Fieldset.Root>
                                <CheckboxGroup
                                  name="statuses"
                                  value={selectedStatuses}
                                  onValueChange={setSelectedStatuses}
                                >
                                  <Fieldset.Content>
                                    <For each={STATUS_OPTIONS}>
                                      {(status) => (
                                        <Checkbox.Root
                                          key={status.value}
                                          value={status.value}
                                        >
                                          <Checkbox.HiddenInput />
                                          <Checkbox.Control />
                                          <Checkbox.Label>
                                            <StatusPill variant={status.value}>
                                              {status.label}
                                            </StatusPill>
                                          </Checkbox.Label>
                                        </Checkbox.Root>
                                      )}
                                    </For>
                                  </Fieldset.Content>
                                </CheckboxGroup>
                              </Fieldset.Root>
                            </Stack>
                          ) : null}
                        </Box>
                      </Collapsible.Content>
                    </Collapsible.Root>
                  );
                })}
              </Box>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default FilterPopUp;
