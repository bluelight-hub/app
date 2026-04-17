import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

const mockList = vi.fn();
vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerListVAlpha: mockList,
    }),
  },
}));

import { cellKey, useGefahrenzonenByCell } from '../use-gefahrenzonen-by-cell';

function makeZone(overrides: Partial<GefahrenzoneDto>): GefahrenzoneDto {
  return {
    id: 'z',
    einsatzId: 'e1',
    gefahrentyp: 'BRAND',
    schutzobjekt: 'MENSCHEN',
    geometryType: 'POLYGON',
    geometry: {} as unknown as { [key: string]: unknown },
    bezeichnung: null,
    warnstufe: 'HOCH',
    erstelltVon: 'u',
    aktualisiertVon: null,
    erstelltAm: new Date(),
    aktualisiertAm: new Date(),
    ...overrides,
  } as GefahrenzoneDto;
}

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('useGefahrenzonenByCell', () => {
  it('liefert leere Maps ohne Zonen', async () => {
    mockList.mockResolvedValueOnce({ data: { einsatzId: 'e1', zonen: [] } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefahrenzonenByCell('e1'), { wrapper });
    await waitFor(() => expect(result.current.data.byCell.size).toBe(0));
    expect(result.current.data.countByCell.size).toBe(0);
  });

  it('gruppiert mehrere Zonen pro Zelle', async () => {
    const zonen = [
      makeZone({ id: 'z1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' }),
      makeZone({ id: 'z2', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' }),
      makeZone({ id: 'z3', gefahrentyp: 'EXPLOSION', schutzobjekt: 'UMWELT' }),
    ];
    mockList.mockResolvedValueOnce({ data: { einsatzId: 'e1', zonen } });
    const { wrapper } = makeWrapper();
    const { result } = renderHook(() => useGefahrenzonenByCell('e1'), { wrapper });

    await waitFor(() => expect(result.current.data.byCell.size).toBe(2));
    expect(result.current.data.countByCell.get(cellKey('BRAND', 'MENSCHEN'))).toBe(2);
    expect(result.current.data.countByCell.get(cellKey('EXPLOSION', 'UMWELT'))).toBe(1);
  });

  it('macht `cellKey` deterministisch', () => {
    expect(cellKey('BRAND', 'MENSCHEN')).toBe('BRAND:MENSCHEN');
  });
});
