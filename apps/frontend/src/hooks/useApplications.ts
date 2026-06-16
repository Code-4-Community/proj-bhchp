import { useEffect, useState } from 'react';
import apiClient from '@api/apiClient';
import type {
  Application,
  ApplicationListParams,
  DisciplineAdminMap,
  DisciplineCatalogItem,
  User,
} from '@api/types';
import {
  getDisciplineAdminMapCached,
  prefetchDisciplineAdminMap,
} from '@utils/disciplineAdminCache';
import {
  EMPTY_APPLICATION_FILTERS,
  normalizeDateToDay,
  type ApplicationFilters,
} from '@utils/applicationFilters';

export interface ApplicationRow {
  appId: number;
  name: string;
  email: string;
  proposedStartDate: string;
  actualStartDate: string;
  discipline: string;
  disciplineAdminName: string;
  desiredExperience: string;
  applicantType: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

/** Default number of applications fetched per page. */
export const APPLICATIONS_PAGE_SIZE = 25;

/** Debounce applied to the free-text search before hitting the backend. */
const SEARCH_DEBOUNCE_MS = 300;

export interface UseApplicationsParams {
  page?: number;
  limit?: number;
  /** Free-text search; debounced before the request is issued. */
  search?: string;
  /** Structured filters from the filter popover. */
  filters?: ApplicationFilters;
}

interface UseApplicationsResult {
  applications: ApplicationRow[];
  loading: boolean;
  error: string | null;
  /** Total number of applications matching the query across all pages. */
  total: number;
  /** Complete discipline label options for the current admin (not page-limited). */
  disciplineOptions: string[];
  /** Complete discipline-admin name options for the current admin (not page-limited). */
  disciplineAdminOptions: string[];
}

/**
 * Static, page-independent context loaded once per admin: the admin's disciplines,
 * the lookups needed to render rows, and the lookups needed to translate the
 * label/admin-name filters into discipline keys for the server request.
 */
interface ApplicationsContext {
  adminDisciplineKeys: string[];
  usersByEmail: Map<string, User>;
  disciplineAdminMap: DisciplineAdminMap;
  disciplineLabelByKey: Map<string, string>;
  disciplineKeyByLabel: Map<string, string>;
  adminNameToKeys: Map<string, string[]>;
  disciplineOptions: string[];
  disciplineAdminOptions: string[];
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toRows(
  applications: Application[],
  usersByEmail: Map<string, User>,
  disciplineAdminMap: Record<string, { firstName: string; lastName: string }>,
  disciplineLabelByKey: Map<string, string>,
): ApplicationRow[] {
  return applications.map((app) => {
    const user = usersByEmail.get(app.email);
    const name = user ? `${user.firstName} ${user.lastName}` : app.email;
    const disciplineAdmin = disciplineAdminMap[app.discipline];
    const disciplineAdminName = disciplineAdmin
      ? `${disciplineAdmin.firstName} ${disciplineAdmin.lastName}`.trim()
      : 'Unassigned';

    return {
      appId: app.appId,
      name,
      email: app.email,
      proposedStartDate: app.proposedStartDate,
      actualStartDate: app.actualStartDate ?? '',
      discipline: disciplineLabelByKey.get(app.discipline) ?? app.discipline,
      disciplineAdminName,
      desiredExperience: app.desiredExperience,
      applicantType: app.applicantType,
      status: app.appStatus,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
    };
  });
}

/**
 * Translates the admin's allowed disciplines, narrowed by the discipline-label and
 * discipline-admin-name filters, into the set of discipline keys to request from the
 * server. Returns the keys to query, or an empty array if the filters exclude every
 * allowed discipline (in which case the caller should render an empty result).
 */
function resolveDisciplineKeys(
  context: ApplicationsContext,
  filters: ApplicationFilters,
): string[] {
  let keys = new Set(
    context.adminDisciplineKeys.map((key) => key.toLowerCase()),
  );

  if (filters.disciplines.length) {
    const filterKeys = new Set(
      filters.disciplines.map((label) =>
        (context.disciplineKeyByLabel.get(label) ?? label).toLowerCase(),
      ),
    );
    keys = new Set([...keys].filter((key) => filterKeys.has(key)));
  }

  if (filters.disciplineAdminNames.length) {
    const adminKeys = new Set<string>();
    filters.disciplineAdminNames.forEach((name) => {
      (context.adminNameToKeys.get(normalizeName(name)) ?? []).forEach((key) =>
        adminKeys.add(key.toLowerCase()),
      );
    });
    keys = new Set([...keys].filter((key) => adminKeys.has(key)));
  }

  return [...keys];
}

/** Builds the backend list params from the debounced search and structured filters. */
function buildListParams(
  page: number,
  limit: number,
  search: string,
  filters: ApplicationFilters,
): ApplicationListParams {
  const params: ApplicationListParams = { page, limit };

  const trimmedSearch = search.trim();
  if (trimmedSearch) {
    params.search = trimmedSearch;
  }

  if (filters.statuses.length) {
    params.statuses = filters.statuses;
  }

  const proposed = normalizeDateToDay(filters.proposedStartDate);
  if (proposed) {
    params.proposedStartDate = proposed;
    params.proposedStartDateDirection =
      filters.proposedStartDateDirection ?? 'after';
  }

  const actual = normalizeDateToDay(filters.actualStartDate);
  if (actual) {
    params.actualStartDate = actual;
    params.actualStartDateDirection =
      filters.actualStartDateDirection ?? 'after';
  }

  const created = normalizeDateToDay(filters.createdAt);
  if (created) {
    params.createdAt = created;
    params.createdAtDirection = filters.createdAtDirection ?? 'after';
  }

  const updated = normalizeDateToDay(filters.updatedAt);
  if (updated) {
    params.updatedAt = updated;
    params.updatedAtDirection = filters.updatedAtDirection ?? 'after';
  }

  return params;
}

export function useApplications({
  page = 1,
  limit = APPLICATIONS_PAGE_SIZE,
  search = '',
  filters = EMPTY_APPLICATION_FILTERS,
}: UseApplicationsParams = {}): UseApplicationsResult {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [context, setContext] = useState<ApplicationsContext | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState(search);

  // Debounce the free-text search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedSearch(search),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [search]);

  // Load the admin-scoped context once (admin disciplines, lookups, filter options).
  useEffect(() => {
    let cancelled = false;

    async function loadContext() {
      try {
        const [currentUser, applicants] = await Promise.all([
          apiClient.getCurrentUser(),
          apiClient.getApplicants(),
        ]);

        if (!currentUser?.email) {
          throw new Error('Failed to determine current admin user');
        }

        const adminInfo = await apiClient.getAdminInfoByEmail(
          currentUser.email,
        );

        if (!adminInfo?.disciplines?.length) {
          throw new Error('Failed to determine admin disciplines');
        }

        await prefetchDisciplineAdminMap(
          undefined,
          adminInfo.disciplines,
        ).catch(() => undefined);

        const [disciplineAdminMap, disciplines] = await Promise.all([
          getDisciplineAdminMapCached().catch(() => ({} as DisciplineAdminMap)),
          apiClient.getDisciplines().catch(() => [] as DisciplineCatalogItem[]),
        ]);

        if (cancelled) {
          return;
        }

        const usersByEmail = new Map(
          applicants.map((applicant) => [applicant.email, applicant] as const),
        );
        const disciplineLabelByKey = new Map(
          disciplines.map((discipline) => [discipline.key, discipline.label]),
        );
        const disciplineKeyByLabel = new Map(
          disciplines.map((discipline) => [discipline.label, discipline.key]),
        );

        const adminNameToKeys = new Map<string, string[]>();
        Object.entries(disciplineAdminMap).forEach(([key, admin]) => {
          const fullName = normalizeName(
            `${admin.firstName} ${admin.lastName}`,
          );
          adminNameToKeys.set(fullName, [
            ...(adminNameToKeys.get(fullName) ?? []),
            key,
          ]);
        });

        const adminKeyList = adminInfo.disciplines;
        const disciplineOptions = Array.from(
          new Set(
            adminKeyList.map((key) => disciplineLabelByKey.get(key) ?? key),
          ),
        ).sort((a, b) => a.localeCompare(b));
        const disciplineAdminOptions = Array.from(
          new Set(
            adminKeyList
              .map((key) => disciplineAdminMap[key])
              .filter(Boolean)
              .map((admin) => `${admin.firstName} ${admin.lastName}`.trim()),
          ),
        ).sort((a, b) => a.localeCompare(b));

        setContext({
          adminDisciplineKeys: adminKeyList,
          usersByEmail,
          disciplineAdminMap,
          disciplineLabelByKey,
          disciplineKeyByLabel,
          adminNameToKeys,
          disciplineOptions,
          disciplineAdminOptions,
        });
      } catch {
        if (!cancelled) {
          setError('Failed to load applications');
          setLoading(false);
        }
      }
    }

    loadContext();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch the requested page whenever the context, page, search, or filters change.
  useEffect(() => {
    if (!context) {
      return;
    }

    let cancelled = false;

    async function fetchPage(ctx: ApplicationsContext) {
      setLoading(true);
      setError(null);

      const disciplineKeys = resolveDisciplineKeys(ctx, filters);

      // Filters excluded every allowed discipline — nothing to fetch.
      if (!disciplineKeys.length) {
        if (!cancelled) {
          setApplications([]);
          setTotal(0);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await apiClient.getApplicationsByDisciplines(
          disciplineKeys,
          buildListParams(page, limit, debouncedSearch, filters),
        );

        if (!cancelled) {
          setTotal(response.total);
          setApplications(
            toRows(
              response.data,
              ctx.usersByEmail,
              ctx.disciplineAdminMap,
              ctx.disciplineLabelByKey,
            ),
          );
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load applications');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPage(context);
    return () => {
      cancelled = true;
    };
  }, [context, page, limit, debouncedSearch, filters]);

  return {
    applications,
    loading,
    error,
    total,
    disciplineOptions: context?.disciplineOptions ?? [],
    disciplineAdminOptions: context?.disciplineAdminOptions ?? [],
  };
}
