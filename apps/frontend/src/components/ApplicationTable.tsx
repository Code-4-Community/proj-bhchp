import { useEffect, useMemo, useState } from 'react';
import { Flex, Input, InputGroup, Spacer, Table } from '@chakra-ui/react';
import type { ApplicationRow } from '@hooks/useApplications';
import StatusPill, { StatusPillConfig, StatusVariant } from './StatusPill';
import {
  compileApplicationFilterPredicate,
  compileApplicationSearchPredicate,
  EMPTY_APPLICATION_FILTERS,
  normalizeDateToDay,
  type ApplicationFilters,
} from '@utils/applicationFilters';
import apiClient from '@api/apiClient';
import { MdEdit } from 'react-icons/md';
import { useNavigate } from 'react-router-dom';

const COLUMNS = [
  'Name',
  'Proposed Date',
  'Actual Start Date',
  'Desired Experience',
  'Applicant Type',
  'Discipline',
  'Discipline Admin',
  'Status',
];

const PRE_LICENSURE_FULL_LABEL =
  'Pre-Licensure Placement (NP/PA, Nursing, Behavioral Health, Psychiatry)';
const PRE_LICENSURE_SHORT_LABEL = 'Pre-Licensure Placement';

interface ApplicationTableProps {
  applications: ApplicationRow[];
  searchQuery?: string;
  filters?: ApplicationFilters;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return dateStr;
  const [, year, month, day] = match;
  return `${month}/${day}/${year}`;
}

function titleCaseName(name?: string): string {
  if (!name) return '—';
  const cleaned = name.trim().replace(/\s+/g, ' ');
  return cleaned
    .split(' ')
    .map((part) =>
      part
        .split('-')
        .map((sub) =>
          sub.length > 0
            ? sub.charAt(0).toUpperCase() + sub.slice(1).toLowerCase()
            : sub,
        )
        .join('-'),
    )
    .join(' ');
}

function formatDesiredExperience(value: string): string {
  if (!value) return '—';
  if (value === PRE_LICENSURE_FULL_LABEL) return PRE_LICENSURE_SHORT_LABEL;
  return value;
}

export function ApplicationTable({
  applications,
  searchQuery = '',
  filters = EMPTY_APPLICATION_FILTERS,
}: ApplicationTableProps) {
  const navigate = useNavigate();
  const [actualStartDates, setActualStartDates] = useState<
    Record<number, string>
  >({});
  const [editingIds, setEditingIds] = useState<Set<number>>(new Set());
  const matchesStructuredFilters = useMemo(
    () => compileApplicationFilterPredicate(filters),
    [filters],
  );

  const matchesSearchQuery = useMemo(
    () => compileApplicationSearchPredicate(searchQuery),
    [searchQuery],
  );

  useEffect(() => {
    setActualStartDates((prev) => {
      const next = { ...prev };
      applications.forEach((application) => {
        if (next[application.appId] === undefined) {
          next[application.appId] =
            normalizeDateToDay(application.actualStartDate) ?? '';
        }
      });
      return next;
    });
  }, [applications]);

  const filteredApplications = useMemo(
    () =>
      applications.filter((application) => {
        return (
          matchesSearchQuery(application) &&
          matchesStructuredFilters(application)
        );
      }),
    [applications, matchesSearchQuery, matchesStructuredFilters],
  );

  const handleActualStartDateUpdate = async (
    nextDate: string,
    application: ApplicationRow,
  ) => {
    if (!application) return;
    const updatedApplication = await apiClient.updateApplicationActualStartDate(
      application.appId,
      nextDate,
    );
    //    setApplicationsState(updatedApplication); TODO
    console.log('we clicked the button!');
  };

  return (
    <Table.Root striped stickyHeader minW="900px">
      <Table.Header>
        <Table.Row>
          {COLUMNS.map((column) => (
            <Table.ColumnHeader
              key={column}
              backgroundColor="#013594"
              color="white"
            >
              {column}
            </Table.ColumnHeader>
          ))}
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {filteredApplications.map((application) => {
          const isEditingActualStart = editingIds.has(application.appId);

          return (
            <Table.Row
              key={application.appId}
              onClick={() =>
                navigate(`/admin/view-application/${application.appId}`)
              }
              transition="background-color 240ms ease-in-out"
              _hover={{
                backgroundColor: '#DBEAFE',
                '& > td': {
                  backgroundColor: '#DBEAFE',
                  transition: 'background-color 240ms ease-in-out',
                },
              }}
            >
              <Table.Cell>{titleCaseName(application.name)}</Table.Cell>
              <Table.Cell>
                {formatDate(application.proposedStartDate)}
              </Table.Cell>
              <Table.Cell
                onClick={(event) => {
                  if (isEditingActualStart) {
                    event.stopPropagation();
                  }
                }}
              >
                <Flex align="center">
                  {isEditingActualStart ? (
                    <InputGroup width="115px" flex="1">
                      <Input
                        type="date"
                        size="xs"
                        value={actualStartDates[application.appId] ?? ''}
                        onChange={(event) => {
                          event.stopPropagation();
                          const value = event.target.value;
                          setActualStartDates((prev) => ({
                            ...prev,
                            [application.appId]: value,
                          }));
                        }}
                      />
                    </InputGroup>
                  ) : (
                    formatDate(actualStartDates[application.appId])
                  )}
                  <Spacer />
                  <MdEdit
                    onClick={(event) => {
                      event.stopPropagation();
                      if (editingIds.has(application.appId)) {
                        handleActualStartDateUpdate(
                          actualStartDates[application.appId] ?? '',
                          application,
                        );

                        setEditingIds((prev) => {
                          const next = new Set(prev);
                          next.delete(application.appId);
                          return next;
                        });
                      } else {
                        setEditingIds((prev) =>
                          new Set(prev).add(application.appId),
                        );
                      }
                    }}
                  />
                </Flex>
              </Table.Cell>
              <Table.Cell>
                {formatDesiredExperience(application.desiredExperience)}
              </Table.Cell>
              <Table.Cell>{application.applicantType}</Table.Cell>
              <Table.Cell>{application.discipline}</Table.Cell>
              <Table.Cell>
                {titleCaseName(application.disciplineAdminName)}
              </Table.Cell>
              <Table.Cell>
                {StatusPillConfig[application.status as StatusVariant] ? (
                  <StatusPill variant={application.status as StatusVariant}>
                    {
                      StatusPillConfig[application.status as StatusVariant]
                        .label
                    }
                  </StatusPill>
                ) : (
                  application.status
                )}
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
}

export default ApplicationTable;
