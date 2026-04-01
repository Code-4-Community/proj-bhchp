import { render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi } from 'vitest';
import { ApplicantType } from '../api/types';
import AdminViewApplication from './AdminViewApplication';

const apiClientMock = {
  getApplication: vi.fn(),
  getLearnerInfo: vi.fn(),
  getVolunteerInfo: vi.fn(),
};

vi.mock('../api/apiClient', () => ({
  default: apiClientMock,
}));

vi.mock('../components/NavBar/NavBar', () => ({
  default: () => <div>NavBar</div>,
}));

vi.mock('../components/AvailabilityTable', () => ({
  default: () => <div>AvailabilityTable</div>,
}));

vi.mock('../components/QuestionFrame', () => ({
  default: () => <div>QuestionFrame</div>,
}));

vi.mock('../components/RequirementsFrame', () => ({
  default: () => <div>RequirementsFrame</div>,
}));

vi.mock('../components/UploadedMaterial', () => ({
  default: () => <div>UploadedMaterial</div>,
}));

vi.mock('../components/SchoolAffiliationFrame', () => ({
  default: () => <div>SchoolAffiliationFrame</div>,
}));

describe('AdminViewApplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders even when learner info is missing (404)', async () => {
    apiClientMock.getApplication.mockResolvedValue({
      appId: 1,
      applicantType: ApplicantType.LEARNER,
      interest: [],
      weeklyHours: 0,
      mondayAvailability: '',
      tuesdayAvailability: '',
      wednesdayAvailability: '',
      thursdayAvailability: '',
      fridayAvailability: '',
      saturdayAvailability: '',
      resume: null,
      coverLetter: null,
      heardAboutFrom: [],
      nonEnglishLangs: null,
    });

    apiClientMock.getLearnerInfo.mockRejectedValue({
      isAxiosError: true,
      response: { status: 404 },
    });

    render(
      <ChakraProvider value={defaultSystem}>
        <MemoryRouter initialEntries={['/admin/applications/1']}>
          <Routes>
            <Route
              path="/admin/applications/:appId"
              element={<AdminViewApplication />}
            />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('AvailabilityTable')).toBeTruthy();
    });

    expect(screen.queryByText('Failed to load learner info')).toBeNull();
    expect(screen.queryByText('Failed to load application')).toBeNull();
  });

  it('shows an error when learner info fails with a non-404', async () => {
    apiClientMock.getApplication.mockResolvedValue({
      appId: 1,
      applicantType: ApplicantType.LEARNER,
      interest: [],
      weeklyHours: 0,
      mondayAvailability: '',
      tuesdayAvailability: '',
      wednesdayAvailability: '',
      thursdayAvailability: '',
      fridayAvailability: '',
      saturdayAvailability: '',
      resume: null,
      coverLetter: null,
      heardAboutFrom: [],
      nonEnglishLangs: null,
    });

    apiClientMock.getLearnerInfo.mockRejectedValue({
      isAxiosError: true,
      response: { status: 500 },
    });

    render(
      <ChakraProvider value={defaultSystem}>
        <MemoryRouter initialEntries={['/admin/applications/1']}>
          <Routes>
            <Route
              path="/admin/applications/:appId"
              element={<AdminViewApplication />}
            />
          </Routes>
        </MemoryRouter>
      </ChakraProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to load learner info')).toBeTruthy();
    });

    expect(screen.queryByText('AvailabilityTable')).toBeNull();
  });
});
