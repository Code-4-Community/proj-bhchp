import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import ApplicationTable from './ApplicationTable';
import type { ApplicationRow } from '@hooks/useApplications';

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
    applicantType: 'Volunteer',
    status: 'Accepted',
  },
];

describe('ApplicationTable', () => {
  it('should render all column headers', () => {
    renderWithChakra(<ApplicationTable applications={[]} />);

    const expectedColumns = [
      'Name',
      'Proposed Date',
      'Actual Start Date',
      'Discipline',
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
    expect(screen.getByText('RN')).toBeDefined();
    expect(screen.getByText('Social Work')).toBeDefined();
    expect(screen.getByText('Learner')).toBeDefined();
    expect(screen.getByText('Volunteer')).toBeDefined();
    expect(screen.getByText('Submitted')).toBeDefined();
    expect(screen.getByText('Accepted')).toBeDefined();
  });

  it('should format dates correctly', () => {
    renderWithChakra(<ApplicationTable applications={mockApplications} />);

    expect(screen.getByText('01/15/2026')).toBeDefined();
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
    renderWithChakra(
      <ApplicationTable applications={mockApplications} searchQuery="Jane" />,
    );

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should filter applications by search query on discipline', () => {
    renderWithChakra(
      <ApplicationTable applications={mockApplications} searchQuery="Social" />,
    );

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeDefined();
  });

  it('should filter applications by search query on status', () => {
    renderWithChakra(
      <ApplicationTable
        applications={mockApplications}
        searchQuery="accepted"
      />,
    );

    expect(screen.queryByText('Jane Doe')).toBeNull();
    expect(screen.getByText('John Smith')).toBeDefined();
  });

  it('should filter applications by search query on email', () => {
    renderWithChakra(
      <ApplicationTable applications={mockApplications} searchQuery="jane@" />,
    );

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.queryByText('John Smith')).toBeNull();
  });

  it('should be case-insensitive when filtering', () => {
    renderWithChakra(
      <ApplicationTable applications={mockApplications} searchQuery="JANE" />,
    );

    expect(screen.getByText('Jane Doe')).toBeDefined();
  });

  it('should show all applications when search query is empty', () => {
    renderWithChakra(
      <ApplicationTable applications={mockApplications} searchQuery="" />,
    );

    expect(screen.getByText('Jane Doe')).toBeDefined();
    expect(screen.getByText('John Smith')).toBeDefined();
  });

  it('should show no application rows when search matches nothing', () => {
    renderWithChakra(
      <ApplicationTable
        applications={mockApplications}
        searchQuery="zzzznonexistent"
      />,
    );

    const rows = screen.queryAllByRole('row');
    expect(rows).toHaveLength(1);
  });
});
