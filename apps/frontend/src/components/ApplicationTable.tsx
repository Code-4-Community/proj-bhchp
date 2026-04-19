import { Table } from '@chakra-ui/react';
import type { ApplicationRow } from '@hooks/useApplications';
import StatusPill, { StatusPillConfig, StatusVariant } from './StatusPill';

const COLUMNS = [
  'Name',
  'Proposed Date',
  'Actual Start Date',
  'Discipline',
  'Desired Experience',
  'Applicant Type',
  'Status',
];

const PRE_LICENSURE_FULL_LABEL =
  'Pre-Licensure Placement (NP/PA, Nursing, Behavioral Health, Psychiatry)';
const PRE_LICENSURE_SHORT_LABEL = 'Pre-Licensure Placement';

interface ApplicationTableProps {
  applications: ApplicationRow[];
  searchQuery?: string;
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
}: ApplicationTableProps) {
  const filteredApplications = applications.filter((application) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      application.name.toLowerCase().includes(query) ||
      application.discipline.toLowerCase().includes(query) ||
      application.status.toLowerCase().includes(query) ||
      application.email.toLowerCase().includes(query)
    );
  });

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
        {filteredApplications.map((application) => (
          <Table.Row key={application.appId}>
            <Table.Cell>
              <a
                href={`/admin/view-application/${application.appId}`}
                aria-label={`View application ${application.appId}`}
                style={{ color: '#0b5fff', textDecoration: 'underline' }}
              >
                {titleCaseName(application.name)}
              </a>
            </Table.Cell>
            <Table.Cell>{formatDate(application.proposedStartDate)}</Table.Cell>
            <Table.Cell>{formatDate(application.actualStartDate)}</Table.Cell>
            <Table.Cell>{application.discipline}</Table.Cell>
            <Table.Cell>
              {formatDesiredExperience(application.desiredExperience)}
            </Table.Cell>
            <Table.Cell>{application.applicantType}</Table.Cell>
            <Table.Cell>
              <StatusPill variant={application.status as StatusVariant}>
                {StatusPillConfig[application.status as StatusVariant].label}
              </StatusPill>
            </Table.Cell>
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
}

export default ApplicationTable;
