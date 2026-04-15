/**
 * Tests für FunkspruchComposer.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const etbCqrsControllerAddEintragVAlpha = vi.fn();
const rufnameVorschlaegeControllerListVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    etb: () => ({ etbCqrsControllerAddEintragVAlpha }),
    funkkanal: () => ({ rufnameVorschlaegeControllerListVAlpha }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'error-message'),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { FunkspruchComposer } from '../FunkspruchComposer.organism';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const makeKanal = (overrides: Partial<FunkkanalResponseDto>): FunkkanalResponseDto =>
  ({
    id: 'k1',
    einsatzId: 'e1',
    name: 'Kanal 1',
    details: { type: 'tmo', sprechgruppe: 'SG1' },
    status: 'aktiv',
    sortIndex: 0,
    zuordnungen: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }) as unknown as FunkkanalResponseDto;

beforeEach(() => {
  etbCqrsControllerAddEintragVAlpha.mockReset();
  rufnameVorschlaegeControllerListVAlpha.mockResolvedValue({ data: { fahrzeuge: [], personen: [], einheiten: [] }, meta: {} });
});

describe('FunkspruchComposer', () => {
  it('zeigt nur aktive Kanäle im Dropdown', () => {
    const client = makeClient();
    const kanaele = [makeKanal({ id: 'k1', name: 'Aktiv' }), makeKanal({ id: 'k2', name: 'Inaktiv', status: 'inaktiv' as FunkkanalResponseDto['status'] })];
    render(<FunkspruchComposer einsatzId="e1" etbId="etb1" kanaele={kanaele} />, { wrapper: wrapper(client) });

    const select = screen.getByRole('combobox', { name: /Kanal auswählen/i });
    expect(select).toHaveTextContent('Aktiv');
    expect(select).not.toHaveTextContent('Inaktiv');
  });

  it('submittet Funkspruch bei Cmd+Enter', async () => {
    etbCqrsControllerAddEintragVAlpha.mockResolvedValue({ data: { id: 'e1' } });
    const client = makeClient();
    const kanaele = [makeKanal({ id: 'k1' })];
    render(<FunkspruchComposer einsatzId="e1" etbId="etb1" kanaele={kanaele} />, { wrapper: wrapper(client) });

    const textarea = screen.getByLabelText(/Funkspruch-Text/i);
    fireEvent.change(textarea, { target: { value: 'Anfahrt zum Einsatzort' } });
    fireEvent.keyDown(textarea, { key: 'Enter', metaKey: true });

    await waitFor(() => expect(etbCqrsControllerAddEintragVAlpha).toHaveBeenCalled());
    const args = etbCqrsControllerAddEintragVAlpha.mock.calls[0][0];
    expect(args.etbId).toBe('etb1');
    expect(args.addEintragDto.text).toBe('Anfahrt zum Einsatzort');
    expect(args.addEintragDto.kontext).toMatchObject({ type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'routine' });
  });

  it('blockt Submit bei leerem Text', () => {
    const client = makeClient();
    render(<FunkspruchComposer einsatzId="e1" etbId="etb1" kanaele={[makeKanal({ id: 'k1' })]} />, { wrapper: wrapper(client) });
    const submit = screen.getByRole('button', { name: /Senden/i });
    expect(submit).toBeDisabled();
  });
});
