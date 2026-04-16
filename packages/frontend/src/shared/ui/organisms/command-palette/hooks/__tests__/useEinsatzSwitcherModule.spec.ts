/**
 * Unit-Tests für `useEinsatzSwitcherModule`.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const navigateSpy = vi.fn();
const useActiveEinsaetzeWithCountsMock = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
}));

vi.mock('@/features/einsatz/api', () => ({
  useActiveEinsaetzeWithCounts: () => useActiveEinsaetzeWithCountsMock(),
}));

// Import nach vi.mock, sonst schlägt das Mocking fehl.
import { useEinsatzSwitcherModule } from '../useEinsatzSwitcherModule';

describe('useEinsatzSwitcherModule', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    useActiveEinsaetzeWithCountsMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('liefert Modul mit stabiler Identität', () => {
    useActiveEinsaetzeWithCountsMock.mockReturnValue({ data: [] });

    const { result } = renderHook(() => useEinsatzSwitcherModule('einsatz-1'));

    expect(result.current.id).toBe('einsatz-switcher');
    expect(result.current.name).toBe('Einsatz wechseln');
    expect(result.current.color).toBe('red');
  });

  it('liefert leere subPages bei nur einem aktiven Einsatz', () => {
    useActiveEinsaetzeWithCountsMock.mockReturnValue({
      data: [{ id: 'einsatz-1', name: 'Nur einer', alarmstichwort: 'B 1' }],
    });

    const { result } = renderHook(() => useEinsatzSwitcherModule('einsatz-1'));

    expect(result.current.subPages).toHaveLength(0);
  });

  it('blendet den aktuellen Einsatz aus', () => {
    useActiveEinsaetzeWithCountsMock.mockReturnValue({
      data: [
        { id: 'einsatz-1', name: 'Wohnhausbrand', alarmstichwort: 'B 4' },
        { id: 'einsatz-2', name: 'Verkehrsunfall', alarmstichwort: 'VU' },
        { id: 'einsatz-3', name: 'Gefahrgut', alarmstichwort: 'ABC 2' },
      ],
    });

    const { result } = renderHook(() => useEinsatzSwitcherModule('einsatz-2'));

    expect(result.current.subPages).toHaveLength(2);
    expect(result.current.subPages.map((page) => page.name)).toEqual(['Wohnhausbrand', 'Gefahrgut']);
  });

  it('übernimmt Alarmstichwort als description', () => {
    useActiveEinsaetzeWithCountsMock.mockReturnValue({
      data: [
        { id: 'einsatz-1', name: 'Brand', alarmstichwort: 'B 4' },
        { id: 'einsatz-2', name: 'VU', alarmstichwort: null },
      ],
    });

    const { result } = renderHook(() => useEinsatzSwitcherModule('einsatz-x'));

    expect(result.current.subPages[0]?.description).toBe('B 4');
    expect(result.current.subPages[1]?.description).toBeUndefined();
  });

  it('navigiert beim Ausführen der Action in die Übersicht des gewählten Einsatzes', () => {
    useActiveEinsaetzeWithCountsMock.mockReturnValue({
      data: [
        { id: 'einsatz-1', name: 'Wohnhausbrand', alarmstichwort: 'B 4' },
        { id: 'einsatz-2', name: 'Verkehrsunfall', alarmstichwort: 'VU' },
      ],
    });

    const { result } = renderHook(() => useEinsatzSwitcherModule('einsatz-1'));

    const switchAction = result.current.subPages[0]?.action;
    expect(switchAction).toBeDefined();

    switchAction?.();

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/übersicht',
      params: { einsatzId: 'einsatz-2' },
    });
  });

  it('kommt mit fehlendem data-Feld (undefined) klar', () => {
    useActiveEinsaetzeWithCountsMock.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useEinsatzSwitcherModule('einsatz-1'));

    expect(result.current.subPages).toHaveLength(0);
  });
});
