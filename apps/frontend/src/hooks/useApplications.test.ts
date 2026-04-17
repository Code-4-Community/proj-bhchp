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

const mockApplicants: Applicant[] = [
  {
    email: 'jane@example.com',
    firstName: 'Jane',
    lastName: 'Doe',
    userType: UserType.STANDARD,
  },
];

vi.mock('@api/apiClient', () => {
  return {
    default: {
      getApplications: vi.fn(),
      getApplicants: vi.fn(),
    },
  };
});

describe('useApplications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(apiClient.getApplicants).mockResolvedValue(mockApplicants);
  });

  it('should start in a loading state', () => {
    vi.mocked(apiClient.getApplications).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useApplications());

    expect(result.current.loading).toBe(true);
    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should fetch applications and users then merge names', async () => {
    vi.mocked(apiClient.getApplications).mockResolvedValue(mockApplications);

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
    expect(first.status).toBe(AppStatus.APP_SUBMITTED);
    expect(first.applicantType).toBe(ApplicantType.LEARNER);

    const second = result.current.applications[1];
    expect(second.appId).toBe(2);
    expect(second.name).toBe('noname@example.com');
    expect(second.proposedStartDate).toBe('2024-03-01');
    expect(second.actualStartDate).toBe('');
  });

  it('should fall back to email when user not found', async () => {
    vi.mocked(apiClient.getApplications).mockResolvedValue(mockApplications);
    vi.mocked(apiClient.getApplicants).mockResolvedValue([]);

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.applications[0].name).toBe('jane@example.com');
    expect(result.current.applications[1].name).toBe('noname@example.com');
  });

  it('should set error state when API call fails', async () => {
    vi.mocked(apiClient.getApplications).mockRejectedValue(
      new Error('Network error'),
    );

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.error).toBe('Failed to load applications');
    expect(result.current.applications).toEqual([]);
  });

  it('should handle empty response', async () => {
    vi.mocked(apiClient.getApplications).mockResolvedValue([]);

    const { result } = renderHook(() => useApplications());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.applications).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it('should call both API endpoints exactly once', async () => {
    vi.mocked(apiClient.getApplications).mockResolvedValue([]);

    renderHook(() => useApplications());

    await waitFor(() => {
      expect(apiClient.getApplications).toHaveBeenCalledTimes(1);
      expect(apiClient.getApplicants).toHaveBeenCalledTimes(1);
    });
  });
});
