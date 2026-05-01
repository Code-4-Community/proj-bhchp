import { useMemo, useState } from 'react';
import {
  Popover,
  Button,
  Portal,
  Stack,
  Input,
  Switch,
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
import {
  countActiveFilters,
  type DateFilterDirection,
  normalizeDateToDay,
  EMPTY_APPLICATION_FILTERS,
  type ApplicationFilters,
} from '@utils/applicationFilters';

export const STATUS_OPTIONS = Object.entries(StatusPillConfig).map(
  ([value, config]) => ({
    value: value as StatusVariant,
    label: config.label,
  }),
);

interface FilterPopUpProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  filters?: ApplicationFilters;
  onFiltersChange?: (next: ApplicationFilters) => void;
  onResetFilters?: () => void;
  disciplineAdminOptions?: string[];
  disciplineOptions?: string[];
}

const FilterPopUp = ({
  open,
  onOpenChange,
  filters = EMPTY_APPLICATION_FILTERS,
  onFiltersChange = () => undefined,
  onResetFilters = () => undefined,
  disciplineAdminOptions = [],
  disciplineOptions = [],
}: FilterPopUpProps) => {
  const capitalize = (s: string): string => {
    return s
      .split(' ')
      .map((s) => s.charAt(0).toUpperCase() + s.substring(1))
      .join(' ');
  };
  const [optionSearchQuery, setOptionSearchQuery] = useState('');
  const [openSections, setOpenSections] = useState<string[]>([
    'Proposed Start Date',
    'Actual Start Date',
    'Discipline',
    'Discipline Admin Name',
    'Status',
  ]);

  const totalFilters = countActiveFilters(filters);

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
      return normalizeDateToDay(filters.proposedStartDate) ? 1 : 0;
    }

    if (category === 'Actual Start Date') {
      return normalizeDateToDay(filters.actualStartDate) ? 1 : 0;
    }

    if (category === 'Discipline') {
      return filters.disciplines.length;
    }

    if (category === 'Status') {
      return filters.statuses.length;
    }

    if (category === 'Discipline Admin Name') {
      return filters.disciplineAdminNames.length;
    }

    return 0;
  };

  const normalizedSearch = optionSearchQuery.trim().toLowerCase();

  const visibleDisciplines = useMemo(() => {
    if (!normalizedSearch) {
      return [...disciplineOptions];
    }

    return disciplineOptions.filter((discipline) =>
      discipline.toLowerCase().includes(normalizedSearch),
    );
  }, [disciplineOptions, normalizedSearch]);

  const visibleStatuses = useMemo(() => {
    if (!normalizedSearch) {
      return STATUS_OPTIONS;
    }

    return STATUS_OPTIONS.filter(
      (status) =>
        status.value.toLowerCase().includes(normalizedSearch) ||
        status.label.toLowerCase().includes(normalizedSearch),
    );
  }, [normalizedSearch]);

  const visibleDisciplineAdmins = useMemo(() => {
    if (!normalizedSearch) {
      return disciplineAdminOptions;
    }

    return disciplineAdminOptions.filter((name) =>
      name.toLowerCase().includes(normalizedSearch),
    );
  }, [disciplineAdminOptions, normalizedSearch]);

  function getDateDirection(category: string): DateFilterDirection {
    if (category === 'Proposed Start Date') {
      return filters.proposedStartDateDirection ?? 'after';
    }

    return filters.actualStartDateDirection ?? 'after';
  }

  function onDateDirectionChange(category: string, checked: boolean) {
    const direction: DateFilterDirection = checked ? 'after' : 'before';

    if (category === 'Proposed Start Date') {
      onFiltersChange({
        ...filters,
        proposedStartDateDirection: direction,
      });
      return;
    }

    onFiltersChange({
      ...filters,
      actualStartDateDirection: direction,
    });
  }

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
                    value={optionSearchQuery}
                    onChange={(event) =>
                      setOptionSearchQuery(event.target.value)
                    }
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
                              <Box>
                                <Flex align="center" gap="2">
                                  <Text
                                    fontSize="xs"
                                    color="gray.700"
                                    minW="42px"
                                  >
                                    Before
                                  </Text>
                                  <Switch.Root
                                    checked={
                                      getDateDirection(category) === 'after'
                                    }
                                    onCheckedChange={(details) =>
                                      onDateDirectionChange(
                                        category,
                                        details.checked,
                                      )
                                    }
                                  >
                                    <Switch.HiddenInput
                                      aria-label={`${category} direction`}
                                    />
                                    <Switch.Control />
                                  </Switch.Root>
                                  <Text
                                    fontSize="xs"
                                    color="gray.700"
                                    minW="32px"
                                  >
                                    After
                                  </Text>
                                </Flex>
                              </Box>
                              <Input
                                placeholder="MM-DD-YYYY"
                                type="text"
                                bg="white"
                                borderRadius="md"
                                borderColor="gray.300"
                                value={
                                  category === 'Proposed Start Date'
                                    ? filters.proposedStartDate ?? ''
                                    : filters.actualStartDate ?? ''
                                }
                                onChange={(e) =>
                                  category === 'Proposed Start Date'
                                    ? onFiltersChange({
                                        ...filters,
                                        proposedStartDate: e.target.value,
                                      })
                                    : onFiltersChange({
                                        ...filters,
                                        actualStartDate: e.target.value,
                                      })
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
                                  name="disciplines"
                                  value={filters.disciplines}
                                  onValueChange={(value) =>
                                    onFiltersChange({
                                      ...filters,
                                      disciplines: value,
                                    })
                                  }
                                >
                                  <Fieldset.Content>
                                    <For each={visibleDisciplines}>
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
                                  value={filters.statuses}
                                  onValueChange={(value) =>
                                    onFiltersChange({
                                      ...filters,
                                      statuses: value,
                                    })
                                  }
                                >
                                  <Fieldset.Content>
                                    <For each={visibleStatuses}>
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
                          ) : category === 'Discipline Admin Name' ? (
                            <Stack gap="3">
                              <Fieldset.Root>
                                <CheckboxGroup
                                  name="discipline_admins"
                                  value={filters.disciplineAdminNames}
                                  onValueChange={(value) =>
                                    onFiltersChange({
                                      ...filters,
                                      disciplineAdminNames: value,
                                    })
                                  }
                                >
                                  <Fieldset.Content>
                                    {visibleDisciplineAdmins.length === 0 ? (
                                      <Text color="gray.600">
                                        No admins available
                                      </Text>
                                    ) : (
                                      <For each={visibleDisciplineAdmins}>
                                        {(name) => (
                                          <Checkbox.Root
                                            key={name}
                                            value={name}
                                          >
                                            <Checkbox.HiddenInput />
                                            <Checkbox.Control />
                                            <Checkbox.Label>
                                              {capitalize(name)}
                                            </Checkbox.Label>
                                          </Checkbox.Root>
                                        )}
                                      </For>
                                    )}
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

              <Flex
                justify="space-between"
                gap="3"
                p="4"
                borderTop="1px solid"
                borderColor="gray.200"
                flexShrink="0"
              >
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setOptionSearchQuery('');
                    onResetFilters();
                  }}
                >
                  Reset
                </Button>
                <Button
                  size="sm"
                  bg="#173685"
                  color="white"
                  _hover={{ bg: '#102660' }}
                  onClick={() => onOpenChange?.(false)}
                >
                  Apply
                </Button>
              </Flex>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  );
};

export default FilterPopUp;
