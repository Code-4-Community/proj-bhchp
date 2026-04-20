import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import apiClient from '@api/apiClient';
import { useApplications } from './useApplications';
import {
  AppStatus,
  ApplicantType,
  DISCIPLINE_VALUES,
  DesiredExperience,
  UserType,
  type Application,
  type User,
} from '@api/types';
import { getDisciplineAdminMapCached } from '@utils/disciplineAdminCache';

const mockApplications: Application[] = [
  {
    appId: 1,
    email: 'jane@example.com',
    proposedStartDate: '2024-01-15',
    actualStartDate: '2024-02-01',
    discipline: DISCIPLINE_VALUES.RN,
    appStatus: AppStatus.APP_SUBMITTED,
    interest: [],
    license: 'n/a',
    phone: '123-456-7890',
    applicantType: ApplicantType.LEARNER,
    weeklyHours: 20,
    pronouns: 'she/her',
    desiredExperience: DesiredExperience.SHADOWING,
    resume: 'resume.pdf',
    coverLetter: 'cover.pdf',
    emergencyContactName: 'Mom',
    emergencyContactPhone: '111-111-1111',
    emergencyContactRelationship: 'Mother',
    mondayAvailability: '9-5',
    tuesdayAvailability: '9-5',
    wednesdayAvailability: '9-5',
    thursdayAvailability: '9-5',
    fridayAvailability: '9-5',
    saturdayAvailability: 'none',
    heardAboutFrom: [],
  },
  {
    appId: 2,
    email: 'noname@example.com',
    proposedStartDate: '2024-03-01',
    discipline: DISCIPLINE_VALUES.SocialWork,
    appStatus: AppStatus.IN_REVIEW,
    interest: [],
    license: 'LCSW',
    phone: '222-333-4444',
    applicantType: ApplicantType.VOLUNTEER,
    weeklyHours: 10,
    pronouns: 'they/them',
    desiredExperience: DesiredExperience.PUBLIC_HEALTH_PROJECT,
    resume: 'resume2.pdf',
    coverLetter: 'cover2.pdf',
    emergencyContactName: 'Dad',
    emergencyContactPhone: '222-222-2222',
    emergencyContactRelationship: 'Father',
    mondayAvailability: 'none',
    tuesdayAvailability: '10-2',
    wednesdayAvailability: 'none',
    thursdayAvailability: '10-2',
    fridayAvailability: 'none',
    saturdayAvailability: 'none',
    heardAboutFrom: [],
  },
];

const mockApplicants: User[] = [
  {
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    userType: UserType.STANDARD,
  },
];

const mockCurrentAdmin = {
  email: 'admin@example.com',
  firstName: 'Admin',
  lastName: 'User',
  userType: UserType.ADMIN,
};

const mockAdminInfo = {
  email: 'admin@example.com',
  discipline: DISCIPLINE_VALUES.RN,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

vi.mock('@api/apiClient', () => {
  return {
    default: {
      getCurrentUser: vi.fn(),
      getAdminInfoByEmail: vi.fn(),
      getApplicationsByDiscipline: vi.fn(),
      getApplicants: vi.fn(),
    },
  };
});

vi.mock('@utils/disciplineAdminCache', () => ({
  getDisciplineAdminMapCached: vi.fn(),
}));

describe('useApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDisciplineAdminMapCached).mockResolvedValue({
      [DISCIPLINE_VALUES.RN]: { firstName: 'Alex', lastName: 'Kim' },
      [DISCIPLINE_VALUES.SocialWork]: { firstName: 'Jo', lastName: 'Rivera' },
    });
    vi.mocked(apiClient.getCurrentUser).mockResolvedValue(mockCurrentAdmin);
    vi.mocked(apiClient.getAdminInfoByEmail).mockResolvedValue(mockAdminInfo);
    vi.mocked(apiClient.getApplicants).mockResolvedValue(mockApplicants);
  });

  it('should start in a loading state', () => {
    vi.mocked(apiClient.getApplicationsByDiscipline).mockReturnValue(
      new Promise(() => {}),
    );

    const { result } = renderHook(() => useApplications());

    expect(result.current.loading).toBe(true);
    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch applications and users then merge names', async () => {
    vi.mocked(apiClient.getApplicationsByDiscipline).mockResolvedValue(
      mockApplications,
    );

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.applications).toHaveLength(2);

    const first = result.current.applications[0];
    expect(first.appId).toBe(1);
    expect(first.name).toBe('Jane Doe');
    expect(first.email).toBe('jane@example.com');
    expect(first.proposedStartDate).toBe('2024-01-15');
    expect(first.actualStartDate).toBe('2024-02-01');
    expect(first.discipline).toBe(DISCIPLINE_VALUES.RN);
    expect(first.disciplineAdminName).toBe('Alex Kim');
    expect(first.status).toBe(AppStatus.APP_SUBMITTED);
    expect(first.applicantType).toBe(ApplicantType.LEARNER);

    const second = result.current.applications[1];
    expect(second.appId).toBe(2);
    expect(second.name).toBe('noname@example.com');
    expect(second.proposedStartDate).toBe('2024-03-01');
    expect(second.actualStartDate).toBe('');
    expect(second.disciplineAdminName).toBe('Jo Rivera');
  });

  it('should fall back to email when user not found', async () => {
    vi.mocked(apiClient.getApplicationsByDiscipline).mockResolvedValue(
      mockApplications,
    );
    vi.mocked(apiClient.getApplicants).mockResolvedValue([]);

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.applications[0].name).toBe('jane@example.com');
    expect(result.current.applications[1].name).toBe('noname@example.com');
  });

  it('should set error state when API call fails', async () => {
    vi.mocked(apiClient.getApplicationsByDiscipline).mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load applications');
    expect(result.current.applications).toEqual([]);
  });

  it('should handle empty response', async () => {
    vi.mocked(apiClient.getApplicationsByDiscipline).mockResolvedValue([]);

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should resolve discipline and call scoped endpoints exactly once', async () => {
    vi.mocked(apiClient.getApplicationsByDiscipline).mockResolvedValue([]);

    renderHook(() => useApplications());

    await waitFor(() => {
      expect(apiClient.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(apiClient.getAdminInfoByEmail).toHaveBeenCalledWith(
        mockCurrentAdmin.email,
      );
      expect(apiClient.getApplicationsByDiscipline).toHaveBeenCalledWith(
        mockAdminInfo.discipline,
      );
      expect(apiClient.getApplicants).toHaveBeenCalledTimes(1);
    });
  });
});
