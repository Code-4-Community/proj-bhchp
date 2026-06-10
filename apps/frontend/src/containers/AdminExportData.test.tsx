import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AdminExportData from './AdminExportData';

const mockDownloadApplicationsCsv = vi.fn();

vi.mock('@api/apiClient', () => ({
  default: {
    downloadApplicationsCsv: (...args: unknown[]) =>
      mockDownloadApplicationsCsv(...args),
  },
}));

vi.mock('@components/NavBar/NavBar', () => ({
  default: () => <div data-testid="nav" />,
}));

function renderPage() {
  return render(
    <ChakraProvider value={defaultSystem}>
      <AdminExportData />
    </ChakraProvider>,
  );
}

describe('AdminExportData', () => {
  beforeEach(() => {
    mockDownloadApplicationsCsv.mockReset();
    mockDownloadApplicationsCsv.mockResolvedValue(undefined);
  });

  it('downloads CSV export for the selected created-at range', async () => {
    renderPage();

    fireEvent.change(screen.getByLabelText('export start date'), {
      target: { value: '2026-01-01' },
    });
    fireEvent.change(screen.getByLabelText('export end date'), {
      target: { value: '2026-01-31' },
    });
    fireEvent.click(screen.getByText('Download CSV'));

    await waitFor(() => {
      expect(mockDownloadApplicationsCsv).toHaveBeenCalledWith(
        '2026-01-01',
        '2026-01-31',
      );
    });
  });

  it('shows a validation message when dates are missing', async () => {
    renderPage();

    fireEvent.click(screen.getByText('Download CSV'));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Failed to export. Please select both created-at dates before exporting.',
        ),
      ).toBeTruthy();
    });
    expect(mockDownloadApplicationsCsv).not.toHaveBeenCalled();
  });
});
