import { useEffect, useState } from 'react';
import apiClient from '@api/apiClient';
import type { Application, DisciplineCatalogItem, User } from '@api/types';
import {
  getDisciplineAdminMapCached,
  prefetchDisciplineAdminMap,
} from '@utils/disciplineAdminCache';

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
}

interface UseApplicationsResult {
  applications: ApplicationRow[];
  loading: boolean;
  error: string | null;
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
    };
  });
}

export function useApplications(): UseApplicationsResult {
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
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

        const [apps, disciplineAdminMap, disciplines] = await Promise.all([
          apiClient.getApplicationsByDisciplines(adminInfo.disciplines),
          getDisciplineAdminMapCached().catch(() => ({})),
          apiClient.getDisciplines().catch(() => [] as DisciplineCatalogItem[]),
        ]);

        if (!cancelled) {
          const usersByEmail = new Map(
            applicants.map((a) => [a.email, a] as const),
          );
          const disciplineLabelByKey = new Map(
            disciplines.map((discipline) => [discipline.key, discipline.label]),
          );
          setApplications(
            toRows(
              apps,
              usersByEmail,
              disciplineAdminMap,
              disciplineLabelByKey,
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

    fetchData();
    return () => {
      cancelled = true;
    };
  }, []);

  return { applications, loading, error };
}
