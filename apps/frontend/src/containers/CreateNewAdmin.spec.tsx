import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';

import CreateNewAdmin from './CreateNewAdmin';
import { ProvisionAdminResponse, UserType } from '@api/types';

const disciplineKeys = {
  rn: 'rn',
} as const;

const { provisionAdminMock, getDisciplinesMock } = vi.hoisted(() => ({
  provisionAdminMock: vi.fn(),
  getDisciplinesMock: vi.fn(),
}));

vi.mock('@api/apiClient', () => ({
  default: {
    provisionAdmin: provisionAdminMock,
    getDisciplines: getDisciplinesMock,
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

function renderCreateNewAdmin() {
  return render(
    <MemoryRouter>
      <ChakraProvider value={defaultSystem}>
        <CreateNewAdmin />
      </ChakraProvider>
    </MemoryRouter>,
  );
}

async function fillValidForm() {
  const emailInputs = screen.getAllByPlaceholderText('admin@bhchp.org');
  fireEvent.change(emailInputs[0], { target: { value: 'Ada@Example.com' } });
  fireEvent.change(emailInputs[1], { target: { value: 'ada@example.com' } });
  fireEvent.change(screen.getByPlaceholderText('John'), {
    target: { value: 'Ada' },
  });
  fireEvent.change(screen.getByPlaceholderText('Doe'), {
    target: { value: 'Lovelace' },
  });
  const option = (await screen.findByRole('option', {
    name: 'RN',
  })) as HTMLOptionElement;
  option.selected = true;
  fireEvent.change(screen.getByRole('listbox'));
}

function buildSuccessResponse(): ProvisionAdminResponse {
  return {
    mode: 'live',
    status: 'SUCCESS',
    cognito: {
      attemptedCreate: true,
      attemptedRollback: false,
      cognitoUsername: 'ada@example.com',
      userStatus: 'FORCE_CHANGE_PASSWORD',
    },
    database: {
      attemptedTransaction: true,
      committed: true,
    },
    records: {
      user: {
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        userType: UserType.ADMIN,
      },
      adminInfo: {
        email: 'ada@example.com',
        disciplines: [disciplineKeys.rn],
        createdAt: '2026-04-15T00:00:00.000Z',
        updatedAt: '2026-04-15T00:00:00.000Z',
      },
    },
    notes: [],
  };
}

describe('CreateNewAdmin', () => {
  beforeEach(() => {
    provisionAdminMock.mockReset();
    getDisciplinesMock.mockReset();
    getDisciplinesMock.mockResolvedValue([
      { key: disciplineKeys.rn, label: 'RN', isActive: true },
    ]);
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('submits the form to the backend and shows success only after the backend confirms', async () => {
    provisionAdminMock.mockResolvedValue(buildSuccessResponse());

    renderCreateNewAdmin();
    await fillValidForm();

    fireEvent.click(screen.getByText('Confirm'));
    fireEvent.click(await screen.findByText('Yes'));

    await waitFor(() => {
      expect(provisionAdminMock).toHaveBeenCalledWith({
        email: 'ada@example.com',
        firstName: 'Ada',
        lastName: 'Lovelace',
        disciplines: [disciplineKeys.rn],
      });
    });

    expect(await screen.findByText('Admin submitted')).toBeTruthy();
    expect(screen.queryByText('Admin creation failed')).not.toBeTruthy();
  });

  it('shows a generic error when the backend reports a non-success provisioning result', async () => {
    provisionAdminMock.mockResolvedValue({
      ...buildSuccessResponse(),
      status: 'DATABASE_WRITE_FAILED_ROLLBACK_FAILED',
      database: {
        attemptedTransaction: true,
        committed: false,
      },
      records: null,
    });

    renderCreateNewAdmin();
    await fillValidForm();

    fireEvent.click(screen.getByText('Confirm'));
    fireEvent.click(await screen.findByText('Yes'));

    expect(await screen.findByText('Admin creation failed')).toBeTruthy();
    expect(screen.queryByText('Admin submitted')).not.toBeTruthy();
    expect(
      screen.getAllByText(
        'We could not finish creating this admin account. Please try again or contact support.',
      ),
    ).toHaveLength(2);
  });
});
