import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import ApplicationTable from './ApplicationTable';
import type { ApplicationRow } from '@hooks/useApplications';

function renderWithChakra(ui: React.ReactElement) {
  return render(
    <ChakraProvider value={defaultSystem}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ChakraProvider>,
  );
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
    createdAt: '2026-01-15T00:00:00.000Z',
    updatedAt: '2026-01-16T00:00:00.000Z',
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
    createdAt: '2026-03-01T00:00:00.000Z',
    updatedAt: '2026-03-02T00:00:00.000Z',
  },
];

// ApplicationTable is now purely presentational: search/filtering happens
// server-side (see useApplications + the backend findByDisciplines tests).
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

  it('should render every application row it is given', () => {
    renderWithChakra(<ApplicationTable applications={mockApplications} />);

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('John Smith')).toBeDefined();
    expect(screen.getByText('Social Work')).toBeDefined();
    expect(screen.getByText('Alex Kim')).toBeDefined();
    expect(screen.getByText('Jo Rivera')).toBeDefined();
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
