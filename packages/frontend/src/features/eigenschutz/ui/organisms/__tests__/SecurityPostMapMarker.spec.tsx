/**
 * Spec für `SecurityPostMapMarker` (Story 4.3, AC10).
 *
 * Schwerpunkte:
 * - Render-`null`-Pfade (isMapLoaded=false, isPending=true).
 * - GeoJSON-Build: Coordinate-Filter, [lon, lat]-Reihenfolge,
 *   Truncation der Ablösezeiten auf 120 Zeichen + „…".
 * - Hover-Tooltip via simulierter `mousemove`/`mouseleave`-Events.
 * - Touch-Tap öffnet Tooltip, Outer-Click schließt ihn.
 * - `prefers-reduced-motion`-Konformität (keine Transition-Klassen,
 *   kein `flyTo`/`setInterval`).
 * - Empty-Ablösezeiten zeigt nur Bezeichnung — kein leerer Absatz.
 */

import { renderWithProviders } from '@/test/utils';
import { act, screen } from '@testing-library/react';
import { createRef } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listMock, sourceDataSpy, layerSpy, popupRenderSpy, mapEventListeners, mapAddImageSpy, mapHasImageSpy, mapFlyToSpy } = vi.hoisted(() => ({
  listMock: { current: vi.fn() },
  sourceDataSpy: vi.fn(),
  layerSpy: vi.fn(),
  popupRenderSpy: vi.fn(),
  mapEventListeners: { current: new Map<string, Array<{ layer?: string; handler: (event: unknown) => void }>>() },
  mapAddImageSpy: vi.fn(),
  mapHasImageSpy: vi.fn(() => false),
  mapFlyToSpy: vi.fn(),
}));

vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children, data, ...rest }: { children?: React.ReactNode; data: unknown; id: string; type: string }) => {
    sourceDataSpy(data);
    return <div data-testid={`source-${rest.id}`}>{children}</div>;
  },
  Layer: (props: Record<string, unknown>) => {
    layerSpy(props);
    return <div data-testid={`layer-${props.id as string}`} />;
  },
  Popup: ({ children, longitude, latitude }: { children?: React.ReactNode; longitude: number; latitude: number }) => {
    popupRenderSpy({ longitude, latitude });
    return <div data-testid="map-popup">{children}</div>;
  },
}));

vi.mock('../../../api/use-sicherungsposten', () => ({
  useListSicherungsposten: (einsatzId: string, status: 'AKTIV' | 'AUFGELOEST') => listMock.current(einsatzId, status),
}));

import { SecurityPostMapMarker, SICHERUNGSPOSTEN_LAYER_ID, SICHERUNGSPOSTEN_MARKER_IMAGE } from '../SecurityPostMapMarker';

function createMockMap() {
  const listeners = mapEventListeners.current;
  return {
    addImage: mapAddImageSpy,
    hasImage: mapHasImageSpy,
    removeImage: vi.fn(),
    flyTo: mapFlyToSpy,
    on: vi.fn((event: string, layerOrHandler: string | ((e: unknown) => void), maybeHandler?: (e: unknown) => void) => {
      const layer = typeof layerOrHandler === 'string' ? layerOrHandler : undefined;
      const handler = typeof layerOrHandler === 'function' ? layerOrHandler : maybeHandler!;
      const list = listeners.get(event) ?? [];
      list.push({ layer, handler });
      listeners.set(event, list);
    }),
    off: vi.fn(),
  };
}

function createMapRef(): React.RefObject<MapRef | null> {
  const ref = createRef<MapRef | null>();
  const mockMap = createMockMap();
  // @ts-expect-error — partial mock genügt für Tests
  ref.current = { getMap: () => mockMap };
  return ref;
}

const POSTEN_COORDINATE_A = {
  id: 'posten-a',
  einsatzId: 'einsatz-1',
  bezeichnung: 'Posten Nord',
  standort: { kind: 'coordinate', longitude: 10.5, latitude: 50.3 },
  abloesezeiten: '08:00 – 12:00 Trupp 1, 12:00 – 16:00 Trupp 2',
  personal: [],
  version: 1,
  erstelltAm: '2026-05-01T10:00:00.000Z',
  erstelltVonUserId: 'u1',
  aktualisiertAm: '2026-05-01T10:00:00.000Z',
  aktualisiertVonUserId: 'u1',
};

const POSTEN_COORDINATE_B = {
  ...POSTEN_COORDINATE_A,
  id: 'posten-b',
  bezeichnung: 'Posten Süd',
  standort: { kind: 'coordinate', longitude: 11.2, latitude: 49.7 },
  abloesezeiten: null,
};

const POSTEN_ADDRESS = {
  ...POSTEN_COORDINATE_A,
  id: 'posten-c',
  bezeichnung: 'Posten Eingang',
  standort: { kind: 'address', text: 'Hörsaal C' },
  abloesezeiten: null,
};

beforeEach(() => {
  mapEventListeners.current.clear();
  sourceDataSpy.mockClear();
  layerSpy.mockClear();
  popupRenderSpy.mockClear();
  mapAddImageSpy.mockClear();
  mapHasImageSpy.mockClear();
  mapFlyToSpy.mockClear();
  mapHasImageSpy.mockReturnValue(false);
  listMock.current = vi.fn(() => ({ data: [], isPending: false, isError: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(props: { isMapLoaded?: boolean; einsatzId?: string } = {}) {
  const mapRef = createMapRef();
  return renderWithProviders(<SecurityPostMapMarker einsatzId={props.einsatzId ?? 'einsatz-1'} mapRef={mapRef} isMapLoaded={props.isMapLoaded ?? true} />);
}

function getLayerListener(event: string, layerId = SICHERUNGSPOSTEN_LAYER_ID) {
  const all = mapEventListeners.current.get(event) ?? [];
  return all.find((l) => l.layer === layerId);
}

describe('SecurityPostMapMarker', () => {
  it('rendert null solange isMapLoaded === false (kein Layer, keine GeoJSON)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    const { container } = setup({ isMapLoaded: false });
    expect(container.querySelector('[data-testid="layer-sicherungsposten-symbols"]')).toBeNull();
    expect(sourceDataSpy).not.toHaveBeenCalled();
  });

  it('rendert null solange useListSicherungsposten isPending === true', () => {
    listMock.current = vi.fn(() => ({ data: undefined, isPending: true, isError: false }));
    const { container } = setup({ isMapLoaded: true });
    expect(container.querySelector('[data-testid="layer-sicherungsposten-symbols"]')).toBeNull();
  });

  it('filtert address-Posten heraus und liefert nur coordinate-Features (2 von 3)', () => {
    listMock.current = vi.fn(() => ({
      data: [POSTEN_COORDINATE_A, POSTEN_COORDINATE_B, POSTEN_ADDRESS],
      isPending: false,
      isError: false,
    }));
    setup();
    const lastCall = sourceDataSpy.mock.lastCall?.[0] as GeoJSON.FeatureCollection;
    expect(lastCall.features).toHaveLength(2);
    const ids = lastCall.features.map((f) => (f.properties as { postenId: string }).postenId);
    expect(ids).toEqual(['posten-a', 'posten-b']);
    expect(ids).not.toContain('posten-c');
  });

  it('verwendet GeoJSON-Konvention [longitude, latitude] (kein Lon/Lat-Bug)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const fc = sourceDataSpy.mock.lastCall?.[0] as GeoJSON.FeatureCollection<GeoJSON.Point>;
    expect(fc.features[0].geometry.coordinates).toEqual([10.5, 50.3]);
  });

  it('filtert Posten mit ungültigen Koordinaten (NaN/Infinity/Out-of-Range) heraus', () => {
    const corrupt = [
      { ...POSTEN_COORDINATE_A, id: 'p-nan', standort: { kind: 'coordinate', longitude: Number.NaN, latitude: 50 } },
      { ...POSTEN_COORDINATE_A, id: 'p-inf', standort: { kind: 'coordinate', longitude: 10, latitude: Number.POSITIVE_INFINITY } },
      { ...POSTEN_COORDINATE_A, id: 'p-range', standort: { kind: 'coordinate', longitude: 200, latitude: 50 } },
      POSTEN_COORDINATE_A,
    ];
    listMock.current = vi.fn(() => ({ data: corrupt, isPending: false, isError: false }));
    setup();
    const fc = sourceDataSpy.mock.lastCall?.[0] as GeoJSON.FeatureCollection;
    expect(fc.features).toHaveLength(1);
    expect((fc.features[0].properties as { postenId: string }).postenId).toBe('posten-a');
  });

  it('kürzt lange Ablösezeiten auf 120 Zeichen mit „…"-Suffix', () => {
    const longText = 'A'.repeat(150);
    const longPosten = { ...POSTEN_COORDINATE_A, abloesezeiten: longText };
    listMock.current = vi.fn(() => ({ data: [longPosten], isPending: false, isError: false }));
    setup();
    const fc = sourceDataSpy.mock.lastCall?.[0] as GeoJSON.FeatureCollection;
    const tooltip = (fc.features[0].properties as { abloesezeitenTooltip: string }).abloesezeitenTooltip;
    expect(tooltip).toHaveLength(120);
    expect(tooltip.endsWith('…')).toBe(true);
  });

  it('aktiviert keine Motion-Pfade bei prefers-reduced-motion (kein flyTo, kein setInterval, keine transition-Klassen, keine zoom-stop icon-size)', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    } as unknown as MediaQueryList);
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    const requestAnimationFrameSpy = vi.spyOn(globalThis, 'requestAnimationFrame');

    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    const { container } = setup();

    const html = container.innerHTML;
    expect(html).not.toMatch(/\btransition-\w/);
    expect(html).not.toMatch(/\banimate-\w/);
    expect(mapFlyToSpy).not.toHaveBeenCalled();
    expect(setIntervalSpy).not.toHaveBeenCalled();
    expect(requestAnimationFrameSpy).not.toHaveBeenCalled();

    const layerProps = layerSpy.mock.lastCall?.[0] as { layout?: Record<string, unknown>; paint?: Record<string, unknown> };
    expect(layerProps.layout?.['icon-size']).toBe(0.8);
    // Kein zoom-stop / interpolate auf icon-size
    expect(Array.isArray(layerProps.layout?.['icon-size'])).toBe(false);
    // Symbol-Layer darf keine circle-* Properties enthalten (würde zoom-abhängige Animation ermöglichen)
    expect(layerProps.paint?.['circle-blur']).toBeUndefined();
  });

  it('öffnet Tooltip bei mousemove und schließt bei mouseleave', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const layerMove = getLayerListener('mousemove');
    expect(layerMove).toBeDefined();

    act(() => {
      layerMove!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10.5, 50.3] },
            properties: {
              postenId: POSTEN_COORDINATE_A.id,
              bezeichnung: POSTEN_COORDINATE_A.bezeichnung,
              abloesezeitenTooltip: '08:00 – 12:00 Trupp 1, 12:00 – 16:00 Trupp 2',
            },
          },
        ],
      });
    });

    expect(screen.getByTestId('map-popup')).toBeInTheDocument();
    expect(screen.getByText('Posten Nord')).toBeInTheDocument();
    expect(screen.getByText('08:00 – 12:00 Trupp 1, 12:00 – 16:00 Trupp 2')).toBeInTheDocument();

    const layerLeave = getLayerListener('mouseleave');
    act(() => {
      layerLeave!.handler({});
    });
    expect(screen.queryByTestId('map-popup')).toBeNull();
  });

  it('aktualisiert Popup-Inhalt beim Wechsel zwischen benachbarten Markern (mousemove)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A, POSTEN_COORDINATE_B], isPending: false, isError: false }));
    setup();
    const layerMove = getLayerListener('mousemove');

    act(() => {
      layerMove!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10.5, 50.3] },
            properties: { postenId: 'posten-a', bezeichnung: 'Posten Nord', abloesezeitenTooltip: '' },
          },
        ],
      });
    });
    expect(screen.getByText('Posten Nord')).toBeInTheDocument();

    act(() => {
      layerMove!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [11.2, 49.7] },
            properties: { postenId: 'posten-b', bezeichnung: 'Posten Süd', abloesezeitenTooltip: '' },
          },
        ],
      });
    });
    expect(screen.queryByText('Posten Nord')).toBeNull();
    expect(screen.getByText('Posten Süd')).toBeInTheDocument();
  });

  it('öffnet Tooltip bei touchstart und schließt bei Outer-Click (Touch-Pfad)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const layerTouch = getLayerListener('touchstart');
    expect(layerTouch).toBeDefined();

    act(() => {
      layerTouch!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10.5, 50.3] },
            properties: { postenId: 'posten-a', bezeichnung: 'Posten Nord', abloesezeitenTooltip: '' },
          },
        ],
      });
    });
    expect(screen.getByText('Posten Nord')).toBeInTheDocument();

    // Outer-Click ohne Layer-Features → schließt
    const outerClick = (mapEventListeners.current.get('click') ?? []).find((l) => !l.layer);
    expect(outerClick).toBeDefined();
    act(() => {
      outerClick!.handler({ features: [] });
    });
    expect(screen.queryByTestId('map-popup')).toBeNull();
  });

  it('zeigt bei leeren Ablösezeiten nur die Bezeichnung — kein leerer zweiter Absatz', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_B], isPending: false, isError: false }));
    setup();
    const layerMove = getLayerListener('mousemove');
    act(() => {
      layerMove!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [11.2, 49.7] },
            properties: {
              postenId: POSTEN_COORDINATE_B.id,
              bezeichnung: POSTEN_COORDINATE_B.bezeichnung,
              abloesezeitenTooltip: '',
            },
          },
        ],
      });
    });

    const popup = screen.getByTestId('map-popup');
    expect(popup).toHaveTextContent('Posten Süd');
    const paragraphs = popup.querySelectorAll('p');
    expect(paragraphs).toHaveLength(1);
    expect(screen.queryByText('—')).toBeNull();
  });

  it('verwendet die exportierte Layer-ID-Konstante (für Story-4.4-Wiederverwendung)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const layerProps = layerSpy.mock.lastCall?.[0] as { id: string; layout: Record<string, unknown> };
    expect(layerProps.id).toBe(SICHERUNGSPOSTEN_LAYER_ID);
    expect(layerProps.layout['icon-image']).toBe(SICHERUNGSPOSTEN_MARKER_IMAGE);
  });
});
