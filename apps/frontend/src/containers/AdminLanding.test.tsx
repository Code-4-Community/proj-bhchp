import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AdminLanding from './AdminLanding';
import { EMPTY_APPLICATION_FILTERS } from '@utils/applicationFilters';

const mockUseApplications = vi.fn();
const tablePropsSpy = vi.fn();

vi.mock('@hooks/useApplications', () => ({
  useApplications: () => mockUseApplications(),
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
  default: (props: unknown) => {
    tablePropsSpy(props);
    return <div data-testid="application-table" />;
  },
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

describe('AdminLanding', () => {
  beforeEach(() => {
    tablePropsSpy.mockClear();
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
        },
      ],
      loading: false,
      error: null,
    });
  });

  it('passes initial search and filters to ApplicationTable', () => {
    renderPage();

    const lastCallArgs = tablePropsSpy.mock.calls.at(-1)?.[0] as {
      searchQuery: string;
      filters: typeof EMPTY_APPLICATION_FILTERS;
    };

    expect(lastCallArgs.searchQuery).toBe('');
    expect(lastCallArgs.filters).toEqual(EMPTY_APPLICATION_FILTERS);
  });

  it('updates search query passed to ApplicationTable', () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('search'), {
      target: { value: 'jane' },
    });

    const lastCallArgs = tablePropsSpy.mock.calls.at(-1)?.[0] as {
      searchQuery: string;
    };

    expect(lastCallArgs.searchQuery).toBe('jane');
  });

  it('updates filters and supports reset behavior', () => {
    renderPage();

    fireEvent.click(screen.getByText('apply-filters'));

    let lastCallArgs = tablePropsSpy.mock.calls.at(-1)?.[0] as {
      filters: {
        statuses: string[];
        disciplines: string[];
        disciplineAdminNames: string[];
        proposedStartDate?: string;
        proposedStartDateDirection?: 'before' | 'after';
        actualStartDate?: string;
        actualStartDateDirection?: 'before' | 'after';
      };
    };

    expect(lastCallArgs.filters.statuses).toEqual(['Accepted']);
    expect(lastCallArgs.filters.disciplines).toEqual(['RN']);

    fireEvent.click(screen.getByText('reset-filters'));

    lastCallArgs = tablePropsSpy.mock.calls.at(-1)?.[0] as {
      filters: typeof EMPTY_APPLICATION_FILTERS;
    };

    expect(lastCallArgs.filters).toEqual(EMPTY_APPLICATION_FILTERS);
  });
});
