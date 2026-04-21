import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ApplicationTable from './ApplicationTable';
import type { ApplicationRow } from '@hooks/useApplications';
import {
  EMPTY_APPLICATION_FILTERS,
  type ApplicationFilters,
} from '@utils/applicationFilters';

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

const mockApplications: ApplicationRow[] = [
  {
    appId: 1,
    name: 'Jane Doe',
    email: 'jane@example.com',
    proposedStartDate: '2026-01-15',
    actualStartDate: '2026-02-01',
    discipline: 'RN',
    disciplineAdminName: 'Alex Kim',
    desiredExperience: 'Shadowing',
    applicantType: 'Learner',
    status: 'App Submitted',
  },
  {
    appId: 2,
    name: 'John Smith',
    email: 'john@example.com',
    proposedStartDate: '2026-03-01',
    actualStartDate: '',
    discipline: 'Social Work',
    disciplineAdminName: 'Jo Rivera',
    desiredExperience: 'Public Health Project',
    applicantType: 'Volunteer',
    status: 'Accepted',
  },
  {
    appId: 3,
    name: 'Sam Taylor',
    email: 'sam@example.com',
    proposedStartDate: '2026-01-15',
    actualStartDate: '2026-04-12',
    discipline: 'RN',
    disciplineAdminName: 'Jo Rivera',
    desiredExperience: 'Practicum',
    applicantType: 'Learner',
    status: 'In Review',
  },
];

function renderTable(filters?: ApplicationFilters, searchQuery = '') {
  renderWithChakra(
    <ApplicationTable
      applications={mockApplications}
      searchQuery={searchQuery}
      filters={filters ?? EMPTY_APPLICATION_FILTERS}
    />,
  );
}

describe('ApplicationTable', () => {
  it('should render all column headers', () => {
    renderWithChakra(<ApplicationTable applications={[]} />);

    const expectedColumns = [
      'Name',
      'Proposed Date',
      'Actual Start Date',
      'Discipline',
      'Discipline Admin',
      'Desired Experience',
      'Applicant Type',
      'Status',
    ];

    expectedColumns.forEach((col) => {
      expect(screen.getByText(col)).toBeDefined();
    });
  });

  it('should render application rows with correct data', () => {
    renderWithChakra(<ApplicationTable applications={mockApplications} />);

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('John Smith')).toBeDefined();
    expect(screen.getAllByText('RN').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Social Work')).toBeDefined();
    expect(screen.getByText('Alex Kim')).toBeDefined();
    expect(screen.getAllByText('Jo Rivera').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Learner').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Volunteer')).toBeDefined();
    expect(screen.getByText('Submitted')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
  });

  it('should format dates correctly', () => {
    renderWithChakra(<ApplicationTable applications={mockApplications} />);

    expect(screen.getAllByText('01/15/2026').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('02/01/2026')).toBeDefined();
    expect(screen.getByText('03/01/2026')).toBeDefined();
  });

  it('should display em-dash for missing actual start date', () => {
    renderWithChakra(<ApplicationTable applications={mockApplications} />);

    const cells = screen.getAllByRole('cell');
    const emDashCells = cells.filter((cell) => cell.textContent === '—');
    expect(emDashCells.length).toBeGreaterThanOrEqual(1);
  });

  it('should render an empty table body when no applications provided', () => {
    renderWithChakra(<ApplicationTable applications={[]} />);

    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(1);
  });

  it('should filter applications by search query on name', () => {
    renderTable(undefined, 'Jane');

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should filter applications by search query on discipline', () => {
    renderTable(undefined, 'Social');

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeDefined();
  });

  it('should filter applications by search query on status', () => {
    renderTable(undefined, 'accepted');

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeDefined();
  });

  it('should filter applications by search query on email', () => {
    renderTable(undefined, 'jane@');

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should be case-insensitive when filtering', () => {
    renderTable(undefined, 'JANE');

    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('should show all applications when search query is empty', () => {
    renderTable();

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('John Smith')).toBeDefined();
  });

  it('should show no application rows when search matches nothing', () => {
    renderTable(undefined, 'zzzznonexistent');

    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(1);
  });

  it('should filter by status only', () => {
    renderTable({
      ...EMPTY_APPLICATION_FILTERS,
      statuses: ['Accepted'],
    });

    expect(screen.getByText('John Smith')).toBeDefined();
    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.queryByText('Sam Taylor')).toBeNull();
  });

  it('should filter by discipline only', () => {
    renderTable({
      ...EMPTY_APPLICATION_FILTERS,
      disciplines: ['RN'],
    });

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('Sam Taylor')).toBeDefined();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should filter by discipline admin name only', () => {
    renderTable({
      ...EMPTY_APPLICATION_FILTERS,
      disciplineAdminNames: ['Jo Rivera'],
    });

    expect(screen.getByText('John Smith')).toBeDefined();
    expect(screen.getByText('Sam Taylor')).toBeDefined();
    expect(screen.queryByText('Jane Doe')).toBeNull();
  });

  it('should filter by proposed start date using before direction', () => {
    renderTable({
      ...EMPTY_APPLICATION_FILTERS,
      proposedStartDate: '01-15-2026',
      proposedStartDateDirection: 'before',
    });

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('Sam Taylor')).toBeDefined();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should filter by actual start date using after direction', () => {
    renderTable({
      ...EMPTY_APPLICATION_FILTERS,
      actualStartDate: '2026-03-01',
      actualStartDateDirection: 'after',
    });

    expect(screen.getByText('Sam Taylor')).toBeDefined();
    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should combine structured filters with AND semantics', () => {
    renderTable({
      statuses: ['In Review'],
      disciplines: ['RN'],
      disciplineAdminNames: ['Jo Rivera'],
      proposedStartDate: '2026-01-15',
      proposedStartDateDirection: 'after',
      actualStartDate: '2026-03-01',
      actualStartDateDirection: 'after',
    });

    expect(screen.getByText('Sam Taylor')).toBeDefined();
    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should combine search and structured filters', () => {
    renderTable(
      {
        ...EMPTY_APPLICATION_FILTERS,
        disciplines: ['RN'],
      },
      'sam',
    );

    expect(screen.getByText('Sam Taylor')).toBeDefined();
    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should ignore invalid date filter text', () => {
    renderTable({
      ...EMPTY_APPLICATION_FILTERS,
      proposedStartDate: '13-99-2026',
    });

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('John Smith')).toBeDefined();
    expect(screen.getByText('Sam Taylor')).toBeDefined();
  });

  it('should safely render unknown statuses as plain text', () => {
    renderWithChakra(
      <ApplicationTable
        applications={[
          {
            ...mockApplications[0],
            appId: 99,
            name: 'Unknown Status User',
            status: 'Unexpected Status',
          },
        ]}
      />,
    );

    expect(screen.getByText('Unknown Status User')).toBeDefined();
    expect(screen.getByText('Unexpected Status')).toBeDefined();

    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(2);
  });
});
