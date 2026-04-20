import { useEffect, useState } from 'react';
import apiClient from '@api/apiClient';
import type { Application, User } from '@api/types';
import { getDisciplineAdminMapCached } from '@utils/disciplineAdminCache';

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
      discipline: app.discipline,
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
        const disciplineAdminMapPromise = getDisciplineAdminMapCached().catch(
          () => ({}),
        );

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

        if (!adminInfo?.discipline) {
          throw new Error('Failed to determine admin discipline');
        }

        const [apps, disciplineAdminMap] = await Promise.all([
          apiClient.getApplicationsByDiscipline(adminInfo.discipline),
          disciplineAdminMapPromise,
        ]);

        if (!cancelled) {
          const usersByEmail = new Map(
            applicants.map((a) => [a.email, a] as const),
          );
          setApplications(toRows(apps, usersByEmail, disciplineAdminMap));
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
