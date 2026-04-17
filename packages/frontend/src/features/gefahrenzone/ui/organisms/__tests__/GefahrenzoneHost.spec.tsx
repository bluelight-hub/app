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
  WARNSTUFE_CHIP_STYLES: {
    KEINE: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: '—' },
    NIEDRIG: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'N' },
    MITTEL: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'M' },
    HOCH: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'H' },
    AKUT: { bg: 'bg', text: 'text', border: 'border', icon: 'icon', kuerzel: 'A' },
  },
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

vi.mock('@/features/lagekarte/detail-providers', () => ({
  setGefahrenzonenProviderEinsatzId: vi.fn(),
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => vi.fn(),
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

  it('registriert den `draw.create`-Listener auf der Map (Klick-Flow via Detail-Provider, G3)', () => {
    const { wrapper } = makeWrapper();
    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} />, { wrapper });
    expect(mapListeners.has('draw.create')).toBe(true);
    // G3: kein Click-Handler mehr am Host — Zone-Klick wird vom GefahrenzonenDetailProvider konsumiert.
    expect(mapListeners.has('click')).toBe(false);
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

  it('öffnet das DetailPanel, wenn Deep-Link-Prop `focus=zone:<id>` gesetzt ist (G3)', async () => {
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

    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} focus="zone:z-42" />, { wrapper });

    await waitFor(() => expect(screen.getByRole('region')).toBeInTheDocument());
    // Panel-Header ist das h2 mit dem Gefahrentyp-Label.
    expect(screen.getByText(/Brand/i)).toBeInTheDocument();
  });

  it('rendert kein DetailPanel, wenn `focus` auf einen unbekannten Zonen-ID verweist', () => {
    const { client, wrapper } = makeWrapper();
    client.setQueryData(['gefahrenzonen', 'e1'], []);
    render(<GefahrenzoneHost einsatzId="e1" mapRef={mapRef as unknown as Parameters<typeof GefahrenzoneHost>[0]['mapRef']} focus="zone:does-not-exist" />, { wrapper });
    expect(screen.queryByRole('region')).not.toBeInTheDocument();
  });
});
