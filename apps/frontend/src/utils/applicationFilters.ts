export type ApplicationFilters = {
  statuses: string[];
  disciplines: string[];
  disciplineAdminNames: string[];
  proposedStartDate?: string;
  proposedStartDateDirection?: DateFilterDirection;
  actualStartDate?: string;
  actualStartDateDirection?: DateFilterDirection;
};

export type DateFilterDirection = 'before' | 'after';

export const EMPTY_APPLICATION_FILTERS: ApplicationFilters = {
  statuses: [],
  disciplines: [],
  disciplineAdminNames: [],
  proposedStartDate: undefined,
  proposedStartDateDirection: 'after',
  actualStartDate: undefined,
  actualStartDateDirection: 'after',
};

interface FilterableApplication {
  status: string;
  discipline: string;
  disciplineAdminName: string;
  proposedStartDate: string;
  actualStartDate: string;
}

export type ApplicationFilterPredicate = (
  application: FilterableApplication,
) => boolean;

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function toIsoDate(
  year: number,
  month: number,
  day: number,
): string | undefined {
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return undefined;
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));
  const isValid =
    candidate.getUTCFullYear() === year &&
    candidate.getUTCMonth() === month - 1 &&
    candidate.getUTCDate() === day;

  if (!isValid) {
    return undefined;
  }

  const monthString = String(month).padStart(2, '0');
  const dayString = String(day).padStart(2, '0');
  return `${year}-${monthString}-${dayString}`;
}

export function normalizeDateToDay(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const input = value.trim();
  if (!input) {
    return undefined;
  }

  const isoMatch = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const year = Number(isoMatch[1]);
    const month = Number(isoMatch[2]);
    const day = Number(isoMatch[3]);
    return toIsoDate(year, month, day);
  }

  const usMatch = input.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (usMatch) {
    const month = Number(usMatch[1]);
    const day = Number(usMatch[2]);
    const year = Number(usMatch[3]);
    return toIsoDate(year, month, day);
  }

  return undefined;
}

export function countActiveFilters(filters: ApplicationFilters): number {
  return (
    filters.statuses.length +
    filters.disciplines.length +
    filters.disciplineAdminNames.length +
    (normalizeDateToDay(filters.proposedStartDate) ? 1 : 0) +
    (normalizeDateToDay(filters.actualStartDate) ? 1 : 0)
  );
}

function matchesDateDirection(
  candidateDate?: string,
  filterDate?: string,
  direction: DateFilterDirection = 'after',
): boolean {
  if (!filterDate) {
    return true;
  }

  if (!candidateDate) {
    return false;
  }

  if (direction === 'before') {
    return candidateDate <= filterDate;
  }

  return candidateDate >= filterDate;
}

export function matchesApplicationFilters(
  application: FilterableApplication,
  filters: ApplicationFilters,
): boolean {
  return compileApplicationFilterPredicate(filters)(application);
}

export function compileApplicationFilterPredicate(
  filters: ApplicationFilters,
): ApplicationFilterPredicate {
  const allowedStatuses =
    filters.statuses.length > 0
      ? new Set(filters.statuses.map((status) => normalizeText(status)))
      : undefined;

  const allowedDisciplines =
    filters.disciplines.length > 0
      ? new Set(
          filters.disciplines.map((discipline) => normalizeText(discipline)),
        )
      : undefined;

  const allowedAdmins =
    filters.disciplineAdminNames.length > 0
      ? new Set(filters.disciplineAdminNames.map((name) => normalizeText(name)))
      : undefined;

  const normalizedProposedFilter = normalizeDateToDay(
    filters.proposedStartDate,
  );
  const normalizedActualFilter = normalizeDateToDay(filters.actualStartDate);

  return (application: FilterableApplication): boolean => {
    if (
      allowedStatuses &&
      !allowedStatuses.has(normalizeText(application.status))
    ) {
      return false;
    }

    if (
      allowedDisciplines &&
      !allowedDisciplines.has(normalizeText(application.discipline))
    ) {
      return false;
    }

    if (
      allowedAdmins &&
      !allowedAdmins.has(normalizeText(application.disciplineAdminName))
    ) {
      return false;
    }

    const normalizedProposedApplicationDate = normalizeDateToDay(
      application.proposedStartDate,
    );
    if (
      !matchesDateDirection(
        normalizedProposedApplicationDate,
        normalizedProposedFilter,
        filters.proposedStartDateDirection,
      )
    ) {
      return false;
    }

    const normalizedActualApplicationDate = normalizeDateToDay(
      application.actualStartDate,
    );
    if (
      !matchesDateDirection(
        normalizedActualApplicationDate,
        normalizedActualFilter,
        filters.actualStartDateDirection,
      )
    ) {
      return false;
    }

    return true;
  };
}
