import apiClient from '@api/apiClient';
import type { DisciplineAdminMap } from '@api/types';

const CACHE_KEY = 'bhchp.disciplineAdminMap.v2';
const SCHEMA_VERSION = 2;
const DEFAULT_TTL_MS = 28 * 24 * 60 * 60 * 1000;

type PersistedCache = {
  value: DisciplineAdminMap;
  fetchedAt: number;
  ttlMs: number;
  schemaVersion: number;
};

let memoryCache: PersistedCache | null = null;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function isFresh(cache: PersistedCache): boolean {
  return Date.now() - cache.fetchedAt < cache.ttlMs;
}

function readPersistedCache(): PersistedCache | null {
  if (!isBrowser()) return null;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as PersistedCache;
    if (
      !parsed ||
      parsed.schemaVersion !== SCHEMA_VERSION ||
      typeof parsed.fetchedAt !== 'number' ||
      typeof parsed.ttlMs !== 'number' ||
      typeof parsed.value !== 'object' ||
      parsed.value === null
    ) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistCache(cache: PersistedCache): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (err) {
    // Fail open: if localStorage is unavailable (private mode, quota, disabled),
    // keep using the in-memory cache and don't crash the app.
    console.info(
      '[cache] persistCache: localStorage unavailable, using in-memory only',
      { err },
    );
  }
}

function writeCache(
  value: DisciplineAdminMap,
  ttlMs = DEFAULT_TTL_MS,
): DisciplineAdminMap {
  const cache: PersistedCache = {
    value,
    fetchedAt: Date.now(),
    ttlMs,
    schemaVersion: SCHEMA_VERSION,
  };

  memoryCache = cache;
  persistCache(cache);
  return value;
}

export function clearDisciplineAdminMapCache(): void {
  memoryCache = null;
  if (isBrowser()) {
    localStorage.removeItem(CACHE_KEY);
  }
}

export async function getDisciplineAdminMapCached(
  ttlMs = DEFAULT_TTL_MS,
  options?: { forceRefresh?: boolean },
): Promise<DisciplineAdminMap> {
  if (!options?.forceRefresh && memoryCache && isFresh(memoryCache)) {
    return memoryCache.value;
  }

  if (!options?.forceRefresh) {
    const persisted = readPersistedCache();
    if (persisted && isFresh(persisted)) {
      memoryCache = persisted;
      return persisted.value;
    }
  }

  const fetched = await apiClient.getDisciplineAdminMap();
  return writeCache(fetched, ttlMs);
}

export async function prefetchDisciplineAdminMap(
  ttlMs = DEFAULT_TTL_MS,
  requiredDisciplines?: string[],
): Promise<void> {
  const cached = await getDisciplineAdminMapCached(ttlMs);

  if (!requiredDisciplines?.length) {
    return;
  }

  const hasMissingDiscipline = requiredDisciplines.some(
    (discipline) => !cached[discipline],
  );

  if (hasMissingDiscipline) {
    await getDisciplineAdminMapCached(ttlMs, { forceRefresh: true });
  }
}
