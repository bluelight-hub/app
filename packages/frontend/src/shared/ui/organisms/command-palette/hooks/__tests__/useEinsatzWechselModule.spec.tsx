import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useEinsatzWechselModule } from '../useEinsatzWechselModule';

const navigateSpy = vi.fn();
const useParamsSpy = vi.fn();
const useActiveEinsaetzeWithCountsSpy = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => navigateSpy,
  useParams: (...args: unknown[]) => useParamsSpy(...args),
}));

vi.mock('@/features/einsatz/api', () => ({
  useActiveEinsaetzeWithCounts: () => useActiveEinsaetzeWithCountsSpy(),
}));

type FakeEinsatz = {
  id: string;
  nummer: string;
  alarmstichwort: string;
};

const einsatz = (id: string, nummer: string, stichwort: string): FakeEinsatz => ({
  id,
  nummer,
  alarmstichwort: stichwort,
});

describe('useEinsatzWechselModule', () => {
  beforeEach(() => {
    navigateSpy.mockReset();
    useParamsSpy.mockReset();
    useActiveEinsaetzeWithCountsSpy.mockReset();
  });

  it('liefert alle Einsätze außer dem aktuellen als SubPages', () => {
    useParamsSpy.mockReturnValue({ einsatzId: 'e-current' });
    useActiveEinsaetzeWithCountsSpy.mockReturnValue({
      data: [einsatz('e-current', 'E2026-001', 'Brand'), einsatz('e-other', 'E2026-002', 'Unfall')],
    });

    const { result } = renderHook(() => useEinsatzWechselModule());

    expect(result.current.id).toBe('einsatz-wechsel');
    expect(result.current.name).toBe('Einsätze');
    expect(result.current.subPages).toHaveLength(1);
    expect(result.current.subPages[0]).toMatchObject({
      id: 'einsatz-e-other',
      name: 'E2026-002',
      description: 'Unfall',
    });
  });

  it('liefert leere SubPages, wenn nur der aktuelle Einsatz existiert', () => {
    useParamsSpy.mockReturnValue({ einsatzId: 'e-current' });
    useActiveEinsaetzeWithCountsSpy.mockReturnValue({
      data: [einsatz('e-current', 'E2026-001', 'Brand')],
    });

    const { result } = renderHook(() => useEinsatzWechselModule());

    expect(result.current.subPages).toHaveLength(0);
  });

  it('navigiert bei Action zum gewählten Einsatz mit korrekten Params', () => {
    useParamsSpy.mockReturnValue({ einsatzId: 'e-current' });
    useActiveEinsaetzeWithCountsSpy.mockReturnValue({
      data: [einsatz('e-current', 'E2026-001', 'Brand'), einsatz('e-other', 'E2026-002', 'Unfall')],
    });

    const { result } = renderHook(() => useEinsatzWechselModule());
    result.current.subPages[0]?.action?.();

    expect(navigateSpy).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/übersicht',
      params: { einsatzId: 'e-other' },
    });
  });

  it('blendet auch ohne aktive Route keinen Einsatz aus, wenn kein Match', () => {
    useParamsSpy.mockReturnValue(undefined);
    useActiveEinsaetzeWithCountsSpy.mockReturnValue({
      data: [einsatz('e-1', 'E2026-001', 'Brand'), einsatz('e-2', 'E2026-002', 'Unfall')],
    });

    const { result } = renderHook(() => useEinsatzWechselModule());

    expect(result.current.subPages).toHaveLength(2);
  });
});
