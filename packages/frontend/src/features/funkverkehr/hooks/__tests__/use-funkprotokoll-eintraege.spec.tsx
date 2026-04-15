/**
 * Tests für `useFunkprotokollEintraege`.
 *
 * Verifiziert Server-Query-Parameter, Store-Verdrahtung und clientseitige
 * Filter-Anwendung.
 */

import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const etbCqrsControllerGetEtbByEinsatzIdVAlpha = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    etb: () => ({ etbCqrsControllerGetEtbByEinsatzIdVAlpha }),
  },
}));

import { funkprotokollFilterStore, setFilterForEinsatz } from '../../stores/funkprotokoll-filter.store';
import { applyClientFilters, useFunkprotokollEintraege } from '../use-funkprotokoll-eintraege';

const wrapper =
  (client: QueryClient) =>
  ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

const makeClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });

const baseEintrag = {
  id: 'e-1',
  sequenceNumber: 1,
  text: 'Hilfe angefordert',
  kategorie: 'KOMMUNIKATION',
  absender: 'Rotkreuz 83/1',
  empfaenger: 'LST',
  timestamp: new Date('2026-04-15T12:00:00Z'),
  ereignisZeitpunkt: new Date('2026-04-15T12:00:00Z'),
  erfasstAm: new Date('2026-04-15T12:00:01Z'),
  isKorrigiert: false,
  kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'routine' },
};

describe('useFunkprotokollEintraege', () => {
  beforeEach(() => {
    etbCqrsControllerGetEtbByEinsatzIdVAlpha.mockReset();
    funkprotokollFilterStore.setState(() => ({ byEinsatz: {} }));
  });

  afterEach(() => {
    funkprotokollFilterStore.setState(() => ({ byEinsatz: {} }));
  });

  it('schickt kontextType=funkspruch + kanalId, wenn genau EIN Kanal gewählt ist', async () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1'] });
    etbCqrsControllerGetEtbByEinsatzIdVAlpha.mockResolvedValue({ data: { eintraege: [] }, meta: {} });

    const client = makeClient();
    const { result } = renderHook(() => useFunkprotokollEintraege({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(etbCqrsControllerGetEtbByEinsatzIdVAlpha).toHaveBeenCalledWith({
      einsatzId: 'e1',
      kontextType: 'funkspruch',
      kanalId: 'k1',
    });
  });

  it('lässt kanalId weg, wenn mehrere Kanäle gewählt sind (Client-Filter)', async () => {
    setFilterForEinsatz('e1', { kanalIds: ['k1', 'k2'] });
    etbCqrsControllerGetEtbByEinsatzIdVAlpha.mockResolvedValue({ data: { eintraege: [] }, meta: {} });

    const client = makeClient();
    renderHook(() => useFunkprotokollEintraege({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    await waitFor(() => {
      expect(etbCqrsControllerGetEtbByEinsatzIdVAlpha).toHaveBeenCalledWith({
        einsatzId: 'e1',
        kontextType: 'funkspruch',
        kanalId: undefined,
      });
    });
  });

  it('liefert leere Liste bei 404 (ETB existiert noch nicht)', async () => {
    etbCqrsControllerGetEtbByEinsatzIdVAlpha.mockRejectedValue(Object.assign(new Error('not found'), { status: 404 }));

    const client = makeClient();
    const { result } = renderHook(() => useFunkprotokollEintraege({ einsatzId: 'e1' }), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.eintraege).toEqual([]);
    expect(result.current.etb).toBeUndefined();
  });
});

describe('applyClientFilters', () => {
  it('filtert Einträge ohne FunkKontext heraus', () => {
    const standardEintrag = { ...baseEintrag, kontext: { type: 'standard' } } as typeof baseEintrag;
    const result = applyClientFilters([baseEintrag, standardEintrag] as (typeof baseEintrag)[], {
      kanalIds: [],
      prioritaeten: [],
      dichteMode: 'bubbles',
    });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e-1');
  });

  it('filtert nach Priorität', () => {
    const notfallEintrag = { ...baseEintrag, id: 'e-2', kontext: { type: 'funkspruch', kanalId: 'k1', funkPrioritaet: 'notfall' } };
    const result = applyClientFilters([baseEintrag, notfallEintrag] as (typeof baseEintrag)[], {
      kanalIds: [],
      prioritaeten: ['notfall'],
      dichteMode: 'bubbles',
    });
    expect(result.map((e) => e.id)).toEqual(['e-2']);
  });

  it('filtert nach Volltext (case-insensitive)', () => {
    const match = { ...baseEintrag, text: 'WICHTIGE Information' };
    const nomatch = { ...baseEintrag, id: 'e-2', text: 'Anderes Thema' };
    const result = applyClientFilters([match, nomatch] as (typeof baseEintrag)[], {
      kanalIds: [],
      prioritaeten: [],
      dichteMode: 'bubbles',
      volltextQuery: 'wichtige',
    });
    expect(result).toHaveLength(1);
    expect(result[0].text).toContain('WICHTIGE');
  });

  it('filtert nach Multi-Kanal-Auswahl', () => {
    const e2 = { ...baseEintrag, id: 'e-2', kontext: { type: 'funkspruch', kanalId: 'k2', funkPrioritaet: 'routine' } };
    const e3 = { ...baseEintrag, id: 'e-3', kontext: { type: 'funkspruch', kanalId: 'k3', funkPrioritaet: 'routine' } };
    const result = applyClientFilters([baseEintrag, e2, e3] as (typeof baseEintrag)[], {
      kanalIds: ['k1', 'k2'],
      prioritaeten: [],
      dichteMode: 'bubbles',
    });
    expect(result.map((e) => e.id).sort()).toEqual(['e-1', 'e-2']);
  });
});
