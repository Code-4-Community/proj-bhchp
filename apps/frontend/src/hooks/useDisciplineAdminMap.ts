import { useEffect, useState } from 'react';
import type { DisciplineAdminMap } from '@api/types';
import { getDisciplineAdminMapCached } from '@utils/disciplineAdminCache';

type UseDisciplineAdminMapResult = {
  disciplineAdminMap: DisciplineAdminMap;
  loading: boolean;
  error: string | null;
};

export function useDisciplineAdminMap(): UseDisciplineAdminMapResult {
  const [disciplineAdminMap, setDisciplineAdminMap] =
    useState<DisciplineAdminMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const map = await getDisciplineAdminMapCached();
        if (!cancelled) {
          setDisciplineAdminMap(map);
        }
      } catch {
        if (!cancelled) {
          setError('Failed to load discipline admin map');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return { disciplineAdminMap, loading, error };
}
