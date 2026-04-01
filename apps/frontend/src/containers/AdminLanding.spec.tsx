import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import AdminLanding from './AdminLanding';

vi.mock('@api/apiClient', () => ({
  useTotalApplicationsCount: () => ({
    count: 298,
    isLoading: false,
    error: null,
  }),
  useInReviewApplicationsCount: () => ({
    count: 52,
    isLoading: false,
    error: null,
  }),
  useRejectedApplicationsCount: () => ({
    count: 12,
    isLoading: false,
    error: null,
  }),
  useApprovedApplicationsCount: () => ({
    count: 102,
    isLoading: false,
    error: null,
  }),
}));

describe('AdminLanding dashboard counts', () => {
  it('renders live count values from API hooks in dashboard tiles', () => {
    render(
      <ChakraProvider value={defaultSystem}>
        <AdminLanding />
      </ChakraProvider>,
    );

    expect(screen.getByText('Total Applications')).toBeTruthy();
    expect(screen.getByText('Pending Review')).toBeTruthy();

    expect(screen.getByText('298')).toBeTruthy();
    expect(screen.getByText('52')).toBeTruthy();
    expect(screen.getByText('12')).toBeTruthy();
    expect(screen.getByText('102')).toBeTruthy();
  });
});
