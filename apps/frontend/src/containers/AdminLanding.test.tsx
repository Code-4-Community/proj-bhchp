import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AdminLanding from './AdminLanding';
import { EMPTY_APPLICATION_FILTERS } from '@utils/applicationFilters';

const mockUseApplications = vi.fn();

vi.mock('@hooks/useApplications', () => ({
  useApplications: (params: unknown) => mockUseApplications(params),
  APPLICATIONS_PAGE_SIZE: 25,
}));

vi.mock('@api/apiClient', () => ({
  useApprovedApplicationsCount: () => ({ count: 1 }),
  useInReviewApplicationsCount: () => ({ count: 2 }),
  useRejectedApplicationsCount: () => ({ count: 3 }),
  useTotalApplicationsCount: () => ({ count: 6 }),
}));

vi.mock('@components/NavBar/NavBar', () => ({
  default: () => <div data-testid="nav" />,
}));

vi.mock('@components/DashboardCard', () => ({
  default: ({ title, value }: { title: string; value: number }) => (
    <div data-testid="card">{`${title}:${value}`}</div>
  ),
}));

vi.mock('@components/PageTransitionButton', () => ({
  default: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick}>pager</button>
  ),
}));

vi.mock('@components/PageCounter', () => ({
  default: ({ page }: { page: number }) => <div>{`page:${page}`}</div>,
}));

vi.mock('@components/TableSearchBar', () => ({
  default: ({
    value,
    onChange,
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  }) => <input aria-label="search" value={value} onChange={onChange} />,
}));

vi.mock('@components/ApplicationTable', () => ({
  default: () => <div data-testid="application-table" />,
}));

vi.mock('@components/FilterPopUp', () => ({
  default: ({
    onFiltersChange,
    onResetFilters,
  }: {
    onFiltersChange: (filters: {
      statuses: string[];
      disciplines: string[];
      disciplineAdminNames: string[];
      proposedStartDate?: string;
      proposedStartDateDirection?: 'before' | 'after';
      actualStartDate?: string;
      actualStartDateDirection?: 'before' | 'after';
    }) => void;
    onResetFilters: () => void;
  }) => (
    <div>
      <button
        onClick={() =>
          onFiltersChange({
            statuses: ['Accepted'],
            disciplines: ['RN'],
            disciplineAdminNames: ['Alex Kim'],
            proposedStartDate: '2026-01-15',
            proposedStartDateDirection: 'after',
            actualStartDate: '',
            actualStartDateDirection: 'after',
          })
        }
      >
        apply-filters
      </button>
      <button onClick={onResetFilters}>reset-filters</button>
    </div>
  ),
}));

function renderPage() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <AdminLanding />
    </ChakraProvider>,
  );
}

type UseApplicationsArgs = {
  search: string;
  filters: typeof EMPTY_APPLICATION_FILTERS;
};

function lastUseApplicationsArgs(): UseApplicationsArgs {
  return mockUseApplications.mock.calls.at(-1)?.[0] as UseApplicationsArgs;
}

describe('AdminLanding', () => {
  beforeEach(() => {
    mockUseApplications.mockClear();
    mockUseApplications.mockReturnValue({
      applications: [
        {
          appId: 1,
          name: 'Jane Doe',
          email: 'jane@example.com',
          proposedStartDate: '2026-01-15',
          actualStartDate: '',
          discipline: 'RN',
          disciplineAdminName: 'Alex Kim',
          desiredExperience: 'Shadowing',
          applicantType: 'Learner',
          status: 'App Submitted',
          createdAt: '2026-01-15T00:00:00.000Z',
          updatedAt: '2026-01-16T00:00:00.000Z',
        },
      ],
      loading: false,
      error: null,
      total: 1,
      disciplineOptions: ['RN'],
      disciplineAdminOptions: ['Alex Kim'],
    });
  });

  it('passes initial search and filters to useApplications', () => {
    renderPage();

    const args = lastUseApplicationsArgs();

    expect(args.search).toBe('');
    expect(args.filters).toEqual(EMPTY_APPLICATION_FILTERS);
  });

  it('forwards the updated search query to useApplications', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('search'), {
      target: { value: 'jane' },
    });

    expect(lastUseApplicationsArgs().search).toBe('jane');
  });

  it('forwards filter changes and reset to useApplications', () => {
    renderPage();

    fireEvent.click(screen.getByText('apply-filters'));

    let args = lastUseApplicationsArgs();
    expect(args.filters.statuses).toEqual(['Accepted']);
    expect(args.filters.disciplines).toEqual(['RN']);

    fireEvent.click(screen.getByText('reset-filters'));

    args = lastUseApplicationsArgs();
    expect(args.filters).toEqual(EMPTY_APPLICATION_FILTERS);
  });
});
