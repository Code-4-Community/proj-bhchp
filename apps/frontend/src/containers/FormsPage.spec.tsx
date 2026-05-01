import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import FormsPage from './FormsPage';

const apiClientMock = vi.hoisted(() => ({
  getCurrentApplication: vi.fn(),
  getConfidentialityTemplateUrl: vi.fn(),
  getMyConfidentialityForm: vi.fn(),
  uploadMyConfidentialityForm: vi.fn(),
}));

vi.mock('@api/apiClient', () => ({
  default: {
    getCurrentApplication: apiClientMock.getCurrentApplication,
    getConfidentialityTemplateUrl: apiClientMock.getConfidentialityTemplateUrl,
    getMyConfidentialityForm: apiClientMock.getMyConfidentialityForm,
    uploadMyConfidentialityForm: apiClientMock.uploadMyConfidentialityForm,
  },
}));

vi.mock('../auth/cognito', () => ({
  signOutUser: vi.fn(),
}));

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

function renderFormsPage() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <FormsPage />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

describe('FormsPage', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    vi.stubGlobal('open', vi.fn());

    apiClientMock.getCurrentApplication.mockResolvedValue({
      appStatus: 'Accepted',
    });
    apiClientMock.getConfidentialityTemplateUrl.mockResolvedValue({
      templateUrl:
        'https://bucket.s3.us-east-2.amazonaws.com/Confidentiality_Form.pdf',
    });

    apiClientMock.getMyConfidentialityForm.mockResolvedValue({
      fileName: null,
      fileUrl: null,
    });
    apiClientMock.uploadMyConfidentialityForm.mockResolvedValue({
      fileName: '1_confidentiality-1713281234567-a1b2c3.pdf',
      fileUrl:
        'https://bucket.s3.us-east-2.amazonaws.com/1_confidentiality-1713281234567-a1b2c3.pdf',
      appStatus: 'Forms Signed',
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it('downloads the template when the download button is clicked', async () => {
    renderFormsPage();

    const downloadButton = await screen.findByText('Download Template');
    fireEvent.click(downloadButton);

    expect(window.open).toHaveBeenCalledWith(
      'https://bucket.s3.us-east-2.amazonaws.com/Confidentiality_Form.pdf',
      '_blank',
      'noopener,noreferrer',
    );
  });

  it('uploads a pdf and does not show Preview', async () => {
    const { container } = renderFormsPage();

    await screen.findByText('Download Template');

    const input = container.querySelector('input[type="file"]');
    if (!input) {
      throw new Error('Expected file input to exist');
    }

    const file = new File(['signed-pdf'], 'signed.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(apiClientMock.uploadMyConfidentialityForm).toHaveBeenCalledWith(
        file,
      );
    });

    expect(screen.queryByText('Preview')).toBeNull();
  });

  it('shows preview in active status when a form exists', async () => {
    apiClientMock.getCurrentApplication.mockResolvedValue({
      appStatus: 'Active',
    });
    apiClientMock.getMyConfidentialityForm.mockResolvedValue({
      fileName: '1_confidentiality-1713281234567-a1b2c3.pdf',
      fileUrl:
        'https://bucket.s3.us-east-2.amazonaws.com/1_confidentiality-1713281234567-a1b2c3.pdf',
    });

    renderFormsPage();

    expect(await screen.findByText('Preview')).toBeTruthy();
    expect(screen.queryByText('Upload')).toBeNull();
  });

  it('hides forms controls for statuses outside upload/download windows', async () => {
    apiClientMock.getCurrentApplication.mockResolvedValue({
      appStatus: 'In Review',
    });

    renderFormsPage();

    expect(
      await screen.findByText(
        'My Forms uploads are available for Accepted and Forms Signed applicants, and downloads are available for Active and Inactive applicants.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Download Template')).toBeNull();
  });
});
