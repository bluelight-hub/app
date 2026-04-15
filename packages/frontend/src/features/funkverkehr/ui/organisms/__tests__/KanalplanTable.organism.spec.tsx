/**
 * Tests für KanalplanTable.
 *
 * dnd-kit-Interaktion wird nicht simuliert — stattdessen prüfen wir, dass
 * die Tabelle korrekt gerendert, sortiert und Aktionen propagiert.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const funkkanalControllerReorderVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    funkkanal: () => ({ funkkanalControllerReorderVAlpha }),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'error-message'),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import type { FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { KanalplanTable } from '../KanalplanTable.organism';

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

describe('KanalplanTable', () => {
  it('rendert Leermeldung wenn keine Kanäle', () => {
    const client = makeClient();
    render(<KanalplanTable einsatzId="e1" kanaele={[]} />, { wrapper: wrapper(client) });
    expect(screen.getByText(/Noch keine Funkkanäle angelegt/)).toBeInTheDocument();
  });

  it('rendert Kanäle sortiert nach sortIndex', () => {
    const client = makeClient();
    const kanaele = [makeKanal({ id: 'k2', name: 'Bravo', sortIndex: 1 }), makeKanal({ id: 'k1', name: 'Alpha', sortIndex: 0 })];
    render(<KanalplanTable einsatzId="e1" kanaele={kanaele} />, { wrapper: wrapper(client) });
    const rows = screen.getAllByRole('row').slice(1); // header ausschließen
    expect(rows[0]).toHaveTextContent('Alpha');
    expect(rows[1]).toHaveTextContent('Bravo');
  });

  it('ruft onEdit bei Click im Dropdown auf', () => {
    const client = makeClient();
    const onEdit = vi.fn();
    const kanal = makeKanal({ name: 'Testkanal' });
    render(<KanalplanTable einsatzId="e1" kanaele={[kanal]} onEdit={onEdit} />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByRole('button', { name: /Aktionen für Testkanal/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Bearbeiten/i }));
    expect(onEdit).toHaveBeenCalledWith(kanal);
  });
});
