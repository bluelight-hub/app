/**
 * Tests für KanalEditDrawer.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const funkkanalControllerCreateVAlpha = vi.fn();
const funkkanalControllerUpdateVAlpha = vi.fn();
const funkkanalControllerArchiveVAlpha = vi.fn();
const funkkanalControllerReorderVAlpha = vi.fn();
const funkkanalZuordnungControllerCreateVAlpha = vi.fn();
const funkkanalZuordnungControllerUpdateRolleVAlpha = vi.fn();
const funkkanalZuordnungControllerRemoveVAlpha = vi.fn();
const rufnameVorschlaegeControllerListVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    funkkanal: () => ({
      funkkanalControllerCreateVAlpha,
      funkkanalControllerUpdateVAlpha,
      funkkanalControllerArchiveVAlpha,
      funkkanalControllerReorderVAlpha,
      funkkanalZuordnungControllerCreateVAlpha,
      funkkanalZuordnungControllerUpdateRolleVAlpha,
      funkkanalZuordnungControllerRemoveVAlpha,
      rufnameVorschlaegeControllerListVAlpha,
    }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'error-message'),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), custom: vi.fn(), loading: vi.fn(() => 'id'), dismiss: vi.fn() },
}));

import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { KanalEditDrawer } from '../KanalEditDrawer.organism';

const wrapper = (client: QueryClient) => {
  return ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
};

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const renderDrawer = (kanal?: FunkkanalResponseDto) => {
  const client = makeClient();
  const onClose = vi.fn();
  const utils = render(<KanalEditDrawer isOpen einsatzId="e1" onClose={onClose} kanal={kanal} />, { wrapper: wrapper(client) });
  return { ...utils, onClose, client };
};

beforeEach(() => {
  funkkanalControllerCreateVAlpha.mockReset();
  funkkanalControllerUpdateVAlpha.mockReset();
  funkkanalControllerArchiveVAlpha.mockReset();
  rufnameVorschlaegeControllerListVAlpha.mockResolvedValue({ data: { fahrzeuge: [], personen: [], einheiten: [] }, meta: {} });
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('KanalEditDrawer', () => {
  it('zeigt Create-Titel wenn kein Kanal übergeben wird', () => {
    renderDrawer();
    expect(screen.getByRole('heading', { name: /Neuen Kanal anlegen/i })).toBeInTheDocument();
  });

  it('erstellt einen TMO-Kanal', async () => {
    funkkanalControllerCreateVAlpha.mockResolvedValue({ data: { id: 'k1' } });
    const { onClose } = renderDrawer();

    fireEvent.change(screen.getByLabelText(/^Name/i), { target: { value: 'Kanal A' } });
    fireEvent.change(screen.getByLabelText(/Sprechgruppe/i), { target: { value: 'SG1' } });

    fireEvent.click(screen.getByRole('button', { name: /Kanal anlegen/i }));

    await waitFor(() => expect(funkkanalControllerCreateVAlpha).toHaveBeenCalled());
    expect(funkkanalControllerCreateVAlpha).toHaveBeenCalledWith({
      einsatzId: 'e1',
      createFunkkanalDto: expect.objectContaining({
        name: 'Kanal A',
        details: expect.objectContaining({ type: 'tmo', sprechgruppe: 'SG1' }),
      }),
    });
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('zeigt Archivieren-Button im Edit-Modus', () => {
    const kanal: FunkkanalResponseDto = {
      id: 'k1',
      einsatzId: 'e1',
      name: 'Kanal A',
      details: { type: 'tmo', sprechgruppe: 'SG1' },
      status: 'aktiv' as FunkkanalResponseDto['status'],
      sortIndex: 0,
      zuordnungen: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    } as unknown as FunkkanalResponseDto;

    renderDrawer(kanal);
    expect(screen.getByRole('heading', { name: /Kanal bearbeiten/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archivieren/i })).toBeInTheDocument();
  });
});
