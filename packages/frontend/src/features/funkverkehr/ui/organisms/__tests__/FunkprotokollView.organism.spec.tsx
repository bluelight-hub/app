/**
 * Tests für FunkprotokollView (virtualisiert).
 *
 * Virtualizer wird nicht tief simuliert — Fokus auf Render-Pfade,
 * Dichte-Toggle und Fehler-State.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useFunkprotokollEintraegeMock = vi.fn();

vi.mock('@/features/funkverkehr/hooks/use-funkprotokoll-eintraege', () => ({
  useFunkprotokollEintraege: (...args: unknown[]) => useFunkprotokollEintraegeMock(...args),
}));

import type { EintragDto, FunkkanalResponseDto } from '@bluelight-hub/shared/client';
import { FunkprotokollView } from '../FunkprotokollView.organism';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const makeEintrag = (overrides: Partial<EintragDto>): EintragDto =>
  ({
    id: 'e1',
    text: 'Funkspruch 1',
    kategorie: 'kommunikation',
    ereignisZeitpunkt: new Date('2026-04-14T10:00:00Z'),
    erfasstAm: new Date('2026-04-14T10:00:00Z'),
    kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'routine' },
    absender: 'A',
    empfaenger: 'B',
    ...overrides,
  }) as unknown as EintragDto;

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
  useFunkprotokollEintraegeMock.mockReset();
});

describe('FunkprotokollView', () => {
  it('zeigt Leer-Text wenn keine Einträge', () => {
    useFunkprotokollEintraegeMock.mockReturnValue({ eintraege: [], isLoading: false, isError: false, etb: undefined, refetch: vi.fn() });
    const client = makeClient();
    render(<FunkprotokollView einsatzId="e1" kanaele={[]} />, { wrapper: wrapper(client) });
    expect(screen.getByText(/Noch keine Funksprüche/i)).toBeInTheDocument();
  });

  it('zeigt Fehler-Text bei isError', () => {
    useFunkprotokollEintraegeMock.mockReturnValue({ eintraege: [], isLoading: false, isError: true, etb: undefined, refetch: vi.fn() });
    const client = makeClient();
    render(<FunkprotokollView einsatzId="e1" kanaele={[]} />, { wrapper: wrapper(client) });
    expect(screen.getByRole('alert')).toHaveTextContent(/konnte nicht geladen/i);
  });

  it('zählt Einträge im Header', () => {
    useFunkprotokollEintraegeMock.mockReturnValue({ eintraege: [makeEintrag({ id: 'a' }), makeEintrag({ id: 'b' })], isLoading: false, isError: false, etb: undefined, refetch: vi.fn() });
    const client = makeClient();
    render(<FunkprotokollView einsatzId="e1" kanaele={[makeKanal({})]} />, { wrapper: wrapper(client) });
    expect(screen.getByText('2 Einträge')).toBeInTheDocument();
  });

  it('toggelt Dichte-Mode per Button', () => {
    useFunkprotokollEintraegeMock.mockReturnValue({ eintraege: [], isLoading: false, isError: false, etb: undefined, refetch: vi.fn() });
    const client = makeClient();
    render(<FunkprotokollView einsatzId="e1" kanaele={[]} />, { wrapper: wrapper(client) });
    const btn = screen.getByRole('button', { name: /Kompakt umschalten/i });
    fireEvent.click(btn);
    expect(screen.getByRole('button', { name: /Bubbles umschalten/i })).toBeInTheDocument();
  });
});
