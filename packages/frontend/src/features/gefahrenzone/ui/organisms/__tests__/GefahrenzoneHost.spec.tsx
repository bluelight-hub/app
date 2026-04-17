import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

// Map-Event-Registry für Create/Click.
const mapListeners = new Map<string, (e: unknown) => void>();
const fakeMap = {
  on: vi.fn((event: string, handler: (e: unknown) => void) => {
    mapListeners.set(event, handler);
  }),
  off: vi.fn((event: string) => {
    mapListeners.delete(event);
  }),
  queryRenderedFeatures: vi.fn(() => []),
  project: vi.fn(() => ({ x: 100, y: 100 })),
};
const mapRef = { current: { getMap: () => fakeMap } };

vi.mock('react-map-gl/maplibre', () => ({
  Source: () => null,
  Layer: () => null,
}));

vi.mock('@/features/lagekarte/detail-providers/warnstufe-style', () => ({
  getWarnstufeMapStyle: () => ({ fillColor: 'x', strokeColor: 'y', fillOpacity: 1, strokeWidth: 2 }),
}));

const mockCreate = vi.fn();
const mockDelete = vi.fn();
const mockMatrix = vi.fn();
vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerCreateVAlpha: mockCreate,
      gefahrenzoneControllerDeleteVAlpha: mockDelete,
      gefahrenzoneControllerListVAlpha: vi.fn(async () => ({ data: { einsatzId: 'e1', zonen: [] } })),
      gefahrenzoneControllerUpdateGeometryVAlpha: vi.fn(),
    }),
    gefahrenmatrix: () => ({
      gefahrenmatrixControllerUpdateBewertungVAlpha: mockMatrix,
    }),
  },
}));

vi.mock('../../../api/use-gefahrenzone-websocket', () => ({
  useGefahrenzoneWebSocket: () => ({ status: 'disconnected', isConnected: false }),
}));

import { GefahrenzoneHost } from '../GefahrenzoneHost';
import { drawStore, setDrawContext, setDrawMode } from '@/features/lagekarte/stores/draw.store';

function makeWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { client, wrapper };
}

describe('GefahrenzoneHost', () => {
  beforeEach(() => {
    mapListeners.clear();
    fakeMap.on.mockClear();
    fakeMap.off.mockClear();
    mockCreate.mockReset();
    mockDelete.mockReset();
    mockMatrix.mockReset();
    drawStore.setState(() => ({
      drawMode: 'idle',
      selectedFeatureIds: [],
      isDrawToolbarVisible: false,
      isDirectSelect: false,
      snapEnabled: true,
      featureGroups: [],
      isSymbolPanelVisible: false,
      isTemplatePanelVisible: false,
      isLocked: false,
      isZeichenSidebarVisible: false,
      zeichenSidebarTab: 'katalog',
      pendingZeichenPlacement: null,
      selectedZeichenId: null,
      drawContext: null,
    }));
  });

  it('registriert `draw.create`- und `click`-Listener auf der Map', () => {
    const { wrapper } = makeWrapper();
    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} />, { wrapper });
    expect(mapListeners.has('draw.create')).toBe(true);
    expect(mapListeners.has('click')).toBe(true);
  });

  it('öffnet Create-Popover bei draw.create, wenn drawContext === "gefahrenzone"', async () => {
    const { wrapper } = makeWrapper();
    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} />, { wrapper });

    act(() => {
      setDrawContext('gefahrenzone');
      setDrawMode('draw_polygon');
    });

    act(() => {
      mapListeners.get('draw.create')!({
        features: [
          {
            id: 'feat-1',
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
          },
        ],
      });
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: /Neue Gefahrenzone/i })).toBeInTheDocument());
    // drawContext wurde zurückgesetzt
    expect(drawStore.state.drawContext).toBeNull();
    expect(drawStore.state.drawMode).toBe('select');
  });

  it('ignoriert draw.create ohne gefahrenzone-Context', () => {
    const { wrapper } = makeWrapper();
    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} />, { wrapper });

    mapListeners.get('draw.create')!({
      features: [
        {
          id: 'feat-1',
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
        },
      ],
    });

    expect(screen.queryByRole('heading', { name: /Neue Gefahrenzone/i })).not.toBeInTheDocument();
  });

  it('öffnet Edit-Popover bei Klick auf eine Zone', async () => {
    const zone: GefahrenzoneDto = {
      id: 'z-42',
      einsatzId: 'e1',
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
      warnstufe: 'AKUT',
      erstelltVon: 'u',
      aktualisiertVon: null,
      erstelltAm: new Date(),
      aktualisiertAm: new Date(),
    };
    const { client, wrapper } = makeWrapper();
    client.setQueryData(['gefahrenzonen', 'e1'], [zone]);

    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} />, { wrapper });

    fakeMap.queryRenderedFeatures.mockReturnValueOnce([{ properties: { zoneId: 'z-42' } }] as unknown as ReturnType<typeof fakeMap.queryRenderedFeatures>);
    act(() => {
      mapListeners.get('click')!({ point: { x: 5, y: 5 }, lngLat: { lng: 0, lat: 0 } });
    });

    await waitFor(() => expect(screen.getByRole('heading', { name: /Zone bearbeiten/i })).toBeInTheDocument());
  });
});
