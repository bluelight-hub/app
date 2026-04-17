import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockUpdateGeometry = vi.fn();

vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerCreateVAlpha: mockCreate,
      gefahrenzoneControllerDeleteVAlpha: mockDelete,
      gefahrenzoneControllerUpdateGeometryVAlpha: mockUpdateGeometry,
    }),
  },
}));

import { GEFAHRENZONE_QUERY_KEYS } from '../queries';
import { useCreateGefahrenzone, useDeleteGefahrenzone, useUpdateGefahrenzoneGeometry } from '../mutations';

function makeHarness() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

const einsatzId = 'e-1';
const initialZone: GefahrenzoneDto = {
  id: 'z-1',
  einsatzId,
  gefahrentyp: 'BRAND',
  schutzobjekt: 'MENSCHEN',
  geometryType: 'POLYGON',
  geometry: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    },
  } as unknown as { [key: string]: unknown },
  bezeichnung: null,
  warnstufe: 'HOCH',
  erstelltVon: 'u-1',
  aktualisiertVon: null,
  erstelltAm: new Date('2026-01-01'),
  aktualisiertAm: new Date('2026-01-01'),
};

describe('useCreateGefahrenzone', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('fügt optimistisch eine Zone ein und invalidiert nach Erfolg', async () => {
    const { client, wrapper } = makeHarness();
    client.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), [initialZone]);

    let optimisticSnapshot: GefahrenzoneDto[] | undefined;
    mockCreate.mockImplementationOnce(async () => {
      optimisticSnapshot = client.getQueryData<GefahrenzoneDto[]>(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId));
      return { data: { ...initialZone, id: 'z-2', gefahrentyp: 'EXPLOSION' } };
    });

    const { result } = renderHook(() => useCreateGefahrenzone(), { wrapper });
    result.current.mutate({
      einsatzId,
      data: { gefahrentyp: 'EXPLOSION', schutzobjekt: 'MENSCHEN', geometryType: 'POLYGON', geometry: initialZone.geometry },
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockCreate).toHaveBeenCalledOnce();
    expect(optimisticSnapshot).toHaveLength(2);
    expect(optimisticSnapshot![1].id).toMatch(/^temp-/);
  });

  it('rollbackt bei Fehler auf den Snapshot', async () => {
    const { client, wrapper } = makeHarness();
    client.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), [initialZone]);
    mockCreate.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useCreateGefahrenzone(), { wrapper });
    result.current.mutate({
      einsatzId,
      data: { gefahrentyp: 'EXPLOSION', schutzobjekt: 'MENSCHEN', geometryType: 'POLYGON', geometry: initialZone.geometry },
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const after = client.getQueryData<GefahrenzoneDto[]>(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId));
    expect(after).toEqual([initialZone]);
  });
});

describe('useDeleteGefahrenzone', () => {
  beforeEach(() => {
    mockDelete.mockReset();
  });

  it('entfernt die Zone optimistisch und rollbackt bei Fehler', async () => {
    const { client, wrapper } = makeHarness();
    client.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), [initialZone]);

    mockDelete.mockImplementationOnce(async () => {
      const snapshot = client.getQueryData<GefahrenzoneDto[]>(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId));
      expect(snapshot).toEqual([]);
      throw new Error('boom');
    });

    const { result } = renderHook(() => useDeleteGefahrenzone(), { wrapper });
    result.current.mutate({ einsatzId, zoneId: 'z-1' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    const after = client.getQueryData<GefahrenzoneDto[]>(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId));
    expect(after).toEqual([initialZone]);
  });
});

describe('useUpdateGefahrenzoneGeometry', () => {
  beforeEach(() => {
    mockUpdateGeometry.mockReset();
  });

  it('ersetzt die Geometrie optimistisch', async () => {
    const { client, wrapper } = makeHarness();
    client.setQueryData(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId), [initialZone]);

    const newGeometry = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [2, 2],
            [3, 2],
            [3, 3],
            [2, 2],
          ],
        ],
      },
    } as unknown as { [key: string]: unknown };

    let optimisticSnapshot: GefahrenzoneDto[] | undefined;
    mockUpdateGeometry.mockImplementationOnce(async () => {
      optimisticSnapshot = client.getQueryData<GefahrenzoneDto[]>(GEFAHRENZONE_QUERY_KEYS.byEinsatz(einsatzId));
      return { data: { ...initialZone, geometry: newGeometry } };
    });

    const { result } = renderHook(() => useUpdateGefahrenzoneGeometry(), { wrapper });
    result.current.mutate({ einsatzId, zoneId: 'z-1', data: { geometry: newGeometry } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(optimisticSnapshot).toBeDefined();
    expect(optimisticSnapshot![0].geometry).toEqual(newGeometry);
    expect(optimisticSnapshot![0].id).toBe('z-1');
  });
});
