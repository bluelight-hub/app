/**
 * Tests für FunkprotokollFilterSidebar.
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const funkkanalControllerListVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    funkkanal: () => ({ funkkanalControllerListVAlpha }),
  },
}));

import { funkprotokollFilterStore, resetFilterForEinsatz, getFilterForEinsatz } from '@/features/funkverkehr/stores/funkprotokoll-filter.store';
import { FunkprotokollFilterSidebar } from '../FunkprotokollFilterSidebar.organism';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

beforeEach(() => {
  funkprotokollFilterStore.setState(() => ({ byEinsatz: {} }));
  funkkanalControllerListVAlpha.mockResolvedValue({
    data: [
      { id: 'k1', einsatzId: 'e1', name: 'Kanal Alpha', status: 'aktiv', sortIndex: 0, details: { type: 'tmo', sprechgruppe: 'A' }, zuordnungen: [] },
      { id: 'k2', einsatzId: 'e1', name: 'Kanal Bravo', status: 'aktiv', sortIndex: 1, details: { type: 'tmo', sprechgruppe: 'B' }, zuordnungen: [] },
    ],
    meta: {},
  });
});

describe('FunkprotokollFilterSidebar', () => {
  it('toggelt Kanal-Filter im Store', async () => {
    const client = makeClient();
    render(<FunkprotokollFilterSidebar einsatzId="e1" />, { wrapper: wrapper(client) });

    const checkbox = await screen.findByRole('checkbox', { name: /Kanal Kanal Alpha/i });
    fireEvent.click(checkbox);

    expect(getFilterForEinsatz('e1').kanalIds).toEqual(['k1']);
  });

  it('toggelt Priorität-Filter im Store', () => {
    const client = makeClient();
    render(<FunkprotokollFilterSidebar einsatzId="e1" />, { wrapper: wrapper(client) });

    const checkbox = screen.getByRole('checkbox', { name: 'Notfall' });
    fireEvent.click(checkbox);

    expect(getFilterForEinsatz('e1').prioritaeten).toEqual(['notfall']);
  });

  it('setzt per Zurücksetzen-Button alle Filter zurück', () => {
    funkprotokollFilterStore.setState(() => ({ byEinsatz: { e1: { kanalIds: ['k1'], prioritaeten: ['notfall'], dichteMode: 'kompakt' } } }));
    const client = makeClient();
    render(<FunkprotokollFilterSidebar einsatzId="e1" />, { wrapper: wrapper(client) });

    fireEvent.click(screen.getByRole('button', { name: /Zurücksetzen/i }));
    expect(getFilterForEinsatz('e1')).toEqual({ kanalIds: [], prioritaeten: [], dichteMode: 'bubbles' });
    // Unused reset fn to keep symbol import
    resetFilterForEinsatz('e1');
  });
});
