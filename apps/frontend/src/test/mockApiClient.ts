import { vi } from 'vitest';

/**
 * Factory for Vitest `vi.mock('@api/apiClient', …)` replacements.
 *
 * Supplies a default export shaped like {@link import('../api/apiClient').ApiClient}
 * (all methods stubbed with `vi.fn`, no HTTP)
 * and the count hooks with stable `{ count, isLoading, error }` values so components render without a backend.
 *
 * @example default values for the dashboard counts
 * vi.mock('@api/apiClient', () => createMockApiClientModule());
 * @example If you want to use custom values for the dashboard counts, you can do:
 * vi.mock('@api/apiClient', () =>
 *   createMockApiClientModule({
 *     dashboardCounts: { total: 0, inReview: 0, rejected: 0, approved: 0 },
 *     getHelloValue: 'Hello World',
 *   }),
 * );
 */
export function createMockApiClientModule(
  overrides?: Partial<{
    dashboardCounts: {
      total: number;
      inReview: number;
      rejected: number;
      approved: number;
    };
    getHelloValue: string;
    provisionAdmin: ReturnType<typeof vi.fn>;
  }>,
) {
  const counts = overrides?.dashboardCounts ?? {
    total: 298,
    inReview: 52,
    rejected: 12,
    approved: 102,
  };

  return {
    default: {
      getHello: vi.fn().mockResolvedValue(overrides?.getHelloValue ?? 'Hello'),
      getApplications: vi.fn().mockResolvedValue([]),
      getApplication: vi.fn(),
      getApplicants: vi.fn().mockResolvedValue([]),
      getLearnerInfo: vi.fn(),
      getCurrentUser: vi.fn().mockResolvedValue(null),
      provisionAdmin:
        overrides?.provisionAdmin ?? vi.fn().mockResolvedValue(undefined),
      updateAvailability: vi.fn(),
      getTotalApplicationsCount: vi.fn().mockResolvedValue(counts.total),
      getInReviewApplicationsCount: vi.fn().mockResolvedValue(counts.inReview),
      getRejectedApplicationsCount: vi.fn().mockResolvedValue(counts.rejected),
      getApprovedApplicationsCount: vi.fn().mockResolvedValue(counts.approved),
    },
    useTotalApplicationsCount: () => ({
      count: counts.total,
      isLoading: false,
      error: null,
    }),
    useInReviewApplicationsCount: () => ({
      count: counts.inReview,
      isLoading: false,
      error: null,
    }),
    useRejectedApplicationsCount: () => ({
      count: counts.rejected,
      isLoading: false,
      error: null,
    }),
    useApprovedApplicationsCount: () => ({
      count: counts.approved,
      isLoading: false,
      error: null,
    }),
  };
}
