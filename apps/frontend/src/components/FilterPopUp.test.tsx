import { fireEvent, render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import FilterPopUp from './FilterPopUp';
import { EMPTY_APPLICATION_FILTERS } from '@utils/applicationFilters';

class ResizeObserverMock {
  observe() {
    return undefined;
  }

  unobserve() {
    return undefined;
  }

  disconnect() {
    return undefined;
  }
}

if (typeof window !== 'undefined' && !window.ResizeObserver) {
  (
    window as typeof window & { ResizeObserver: typeof ResizeObserverMock }
  ).ResizeObserver = ResizeObserverMock;
}

function renderWithChakra(ui: React.ReactElement) {
  return render(<ChakraProvider value={defaultSystem}>{ui}</ChakraProvider>);
}

describe('FilterPopUp', () => {
  it('shows total filter count based on selected values', () => {
    renderWithChakra(
      <FilterPopUp
        open
        onOpenChange={vi.fn()}
        filters={{
          statuses: ['Accepted'],
          disciplines: ['RN'],
          disciplineAdminNames: ['Alex Kim'],
          proposedStartDate: '2026-01-15',
          proposedStartDateDirection: 'after',
          actualStartDate: 'invalid-date',
          actualStartDateDirection: 'before',
        }}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        disciplineAdminOptions={['Alex Kim', 'Jo Rivera']}
      />,
    );

    expect(screen.getByText('4')).toBeDefined();
  });

  it('calls onResetFilters when reset button is pressed', () => {
    const onResetFilters = vi.fn();

    renderWithChakra(
      <FilterPopUp
        open
        onOpenChange={vi.fn()}
        filters={EMPTY_APPLICATION_FILTERS}
        onFiltersChange={vi.fn()}
        onResetFilters={onResetFilters}
        disciplineAdminOptions={[]}
      />,
    );

    fireEvent.click(screen.getByText('Reset'));
    expect(onResetFilters).toHaveBeenCalledTimes(1);
  });

  it('calls onFiltersChange when date input changes', () => {
    const onFiltersChange = vi.fn();

    renderWithChakra(
      <FilterPopUp
        open
        onOpenChange={vi.fn()}
        filters={EMPTY_APPLICATION_FILTERS}
        onFiltersChange={onFiltersChange}
        onResetFilters={vi.fn()}
        disciplineAdminOptions={[]}
      />,
    );

    const dateInputs = screen.getAllByPlaceholderText('MM-DD-YYYY');
    fireEvent.change(dateInputs[0], { target: { value: '01-15-2026' } });

    expect(onFiltersChange).toHaveBeenCalled();
    const latestCall = onFiltersChange.mock.calls.at(-1)?.[0] as {
      proposedStartDate?: string;
    };
    expect(latestCall.proposedStartDate).toBe('01-15-2026');
  });

  it('renders date direction switch controls', () => {
    renderWithChakra(
      <FilterPopUp
        open
        onOpenChange={vi.fn()}
        filters={EMPTY_APPLICATION_FILTERS}
        onFiltersChange={vi.fn()}
        onResetFilters={vi.fn()}
        disciplineAdminOptions={[]}
      />,
    );

    expect(
      screen.getByLabelText('Proposed Start Date direction'),
    ).toBeDefined();
    expect(screen.getByLabelText('Actual Start Date direction')).toBeDefined();
  });
});
