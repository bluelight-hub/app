/**
 * Spec für `SecurityPostMapMarker` (Story 4.3 + Story 4.4, AC10).
 *
 * Schwerpunkte:
 * - Render-`null`-Pfade (isMapLoaded=false, isPending=true).
 * - GeoJSON-Build: Coordinate-Filter, [lon, lat]-Reihenfolge,
 *   Truncation der Ablösezeiten auf 120 Zeichen + „…", `personalCount`-Feld.
 * - Story 4.4 Click-Popover: Layer-Click öffnet Popover mit Bezeichnung,
 *   Personal-Anzahl und Ablösezeit-Snippet; Outer-Click schließt.
 * - Story 4.4 „Details öffnen"-Action navigiert via `useNavigate` und
 *   schließt das Popover.
 * - Story 4.4 `focus`-Prop triggert FlyTo bei coordinate-Posten und
 *   wird bei address-only silent verworfen (AC9).
 * - Story 4.4 Highlight-Ring verschwindet nach 1.5 s (BITV: kein Pulse-Loop).
 * - `prefers-reduced-motion`-Konformität (keine Tailwind-`animate-*`-Klassen,
 *   kein `setInterval`/`requestAnimationFrame`).
 */

import { renderWithProviders } from '@/test/utils';
import { act, screen } from '@testing-library/react';
import { createRef } from 'react';
import type { MapRef } from 'react-map-gl/maplibre';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { listMock, sourceDataSpy, layerSpy, popupRenderSpy, markerRenderSpy, mapEventListeners, mapAddImageSpy, mapHasImageSpy, mapFlyToSpy, navigateMock } = vi.hoisted(() => ({
  listMock: { current: vi.fn() },
  sourceDataSpy: vi.fn(),
  layerSpy: vi.fn(),
  popupRenderSpy: vi.fn(),
  markerRenderSpy: vi.fn(),
  mapEventListeners: { current: new Map<string, Array<{ layer?: string; handler: (event: unknown) => void }>>() },
  mapAddImageSpy: vi.fn(),
  mapHasImageSpy: vi.fn(() => false),
  mapFlyToSpy: vi.fn(),
  navigateMock: vi.fn(),
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
  Marker: ({ children, longitude, latitude }: { children?: React.ReactNode; longitude: number; latitude: number }) => {
    markerRenderSpy({ longitude, latitude });
    return <div data-testid="map-marker">{children}</div>;
  },
}));

vi.mock('../../../api/use-sicherungsposten', () => ({
  useListSicherungsposten: (einsatzId: string, status: 'AKTIV' | 'AUFGELOEST') => listMock.current(einsatzId, status),
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { SecurityPostMapMarker, SICHERUNGSPOSTEN_LAYER_ID, SICHERUNGSPOSTEN_MARKER_IMAGE } from '../SecurityPostMapMarker';

function createMockMap() {
  const listeners = mapEventListeners.current;
  const canvas = { style: { cursor: '' } };
  return {
    addImage: mapAddImageSpy,
    hasImage: mapHasImageSpy,
    removeImage: vi.fn(),
    flyTo: mapFlyToSpy,
    getCanvas: () => canvas,
    getZoom: () => 12,
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
  personal: [{ name: 'Anna' }, { name: 'Bernd' }],
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
  personal: [],
};

const POSTEN_ADDRESS = {
  ...POSTEN_COORDINATE_A,
  id: 'posten-c',
  bezeichnung: 'Posten Eingang',
  standort: { kind: 'address', text: 'Hörsaal C' },
  abloesezeiten: null,
  personal: [],
};

beforeEach(() => {
  mapEventListeners.current.clear();
  sourceDataSpy.mockClear();
  layerSpy.mockClear();
  popupRenderSpy.mockClear();
  markerRenderSpy.mockClear();
  mapAddImageSpy.mockClear();
  mapHasImageSpy.mockClear();
  mapFlyToSpy.mockClear();
  navigateMock.mockClear();
  mapHasImageSpy.mockReturnValue(false);
  listMock.current = vi.fn(() => ({ data: [], isPending: false, isError: false }));
});

afterEach(() => {
  vi.restoreAllMocks();
});

function setup(props: { isMapLoaded?: boolean; einsatzId?: string; focus?: string } = {}) {
  const mapRef = createMapRef();
  return renderWithProviders(<SecurityPostMapMarker einsatzId={props.einsatzId ?? 'einsatz-1'} mapRef={mapRef} isMapLoaded={props.isMapLoaded ?? true} focus={props.focus} />);
}

function getLayerListener(event: string, layerId = SICHERUNGSPOSTEN_LAYER_ID) {
  const all = mapEventListeners.current.get(event) ?? [];
  return all.find((l) => l.layer === layerId);
}

function getOuterListener(event: string) {
  const all = mapEventListeners.current.get(event) ?? [];
  return all.find((l) => !l.layer);
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

  it('schreibt personalCount in die Feature-Properties (Story 4.4)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A, POSTEN_COORDINATE_B], isPending: false, isError: false }));
    setup();
    const fc = sourceDataSpy.mock.lastCall?.[0] as GeoJSON.FeatureCollection;
    const propsA = fc.features[0].properties as { postenId: string; personalCount: number };
    const propsB = fc.features[1].properties as { postenId: string; personalCount: number };
    expect(propsA.personalCount).toBe(2);
    expect(propsB.personalCount).toBe(0);
  });

  it('aktiviert keine Motion-Pfade bei prefers-reduced-motion (kein flyTo, kein setInterval, keine animate-*-Klassen, keine zoom-stop icon-size)', () => {
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

  it('Story 4.4: öffnet Click-Popover mit Bezeichnung, Personal-Anzahl und Ablösezeit-Snippet', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const click = getLayerListener('click');
    expect(click).toBeDefined();

    act(() => {
      click!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10.5, 50.3] },
            properties: {
              postenId: POSTEN_COORDINATE_A.id,
              bezeichnung: POSTEN_COORDINATE_A.bezeichnung,
              abloesezeitenTooltip: '08:00 – 12:00 Trupp 1, 12:00 – 16:00 Trupp 2',
              personalCount: 2,
            },
          },
        ],
      });
    });

    const popup = screen.getByTestId('map-popup');
    expect(popup).toBeInTheDocument();
    expect(screen.getByText('Posten Nord')).toBeInTheDocument();
    expect(screen.getByText('Personal: 2 Person(en)')).toBeInTheDocument();
    expect(screen.getByText('08:00 – 12:00 Trupp 1, 12:00 – 16:00 Trupp 2')).toBeInTheDocument();
    // aria-label am inneren div
    expect(popup.querySelector('[aria-label="Sicherungsposten Posten Nord"]')).toBeInTheDocument();
  });

  it('Story 4.4: zeigt „Kein Personal hinterlegt" wenn personalCount === 0 und blendet leeres Ablösezeit-Snippet aus', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_B], isPending: false, isError: false }));
    setup();
    const click = getLayerListener('click');
    act(() => {
      click!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [11.2, 49.7] },
            properties: {
              postenId: POSTEN_COORDINATE_B.id,
              bezeichnung: POSTEN_COORDINATE_B.bezeichnung,
              abloesezeitenTooltip: '',
              personalCount: 0,
            },
          },
        ],
      });
    });

    expect(screen.getByText('Posten Süd')).toBeInTheDocument();
    expect(screen.getByText('Kein Personal hinterlegt')).toBeInTheDocument();
    // Kein Ablösezeit-Absatz bei leerem String
    const popup = screen.getByTestId('map-popup');
    const paragraphs = popup.querySelectorAll('p');
    // 2 Paragraphen erwartet: Bezeichnung + „Kein Personal hinterlegt" (kein dritter für Ablöse)
    expect(paragraphs).toHaveLength(2);
  });

  it('Story 4.4: Outer-Click schließt das Popover, Layer-Click bleibt offen', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const click = getLayerListener('click');
    act(() => {
      click!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10.5, 50.3] },
            properties: {
              postenId: 'posten-a',
              bezeichnung: 'Posten Nord',
              abloesezeitenTooltip: '',
              personalCount: 0,
            },
          },
        ],
      });
    });
    expect(screen.getByTestId('map-popup')).toBeInTheDocument();

    const outerClick = getOuterListener('click');
    expect(outerClick).toBeDefined();
    act(() => {
      outerClick!.handler({ features: [] });
    });
    expect(screen.queryByTestId('map-popup')).toBeNull();
  });

  it('Story 4.4: „Details öffnen"-Button navigiert zur Detail-Route und schließt das Popover', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup({ einsatzId: 'einsatz-42' });
    const click = getLayerListener('click');
    act(() => {
      click!.handler({
        features: [
          {
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [10.5, 50.3] },
            properties: {
              postenId: 'posten-a',
              bezeichnung: 'Posten Nord',
              abloesezeitenTooltip: '',
              personalCount: 0,
            },
          },
        ],
      });
    });

    const detailButton = screen.getByTestId('sicherungsposten-popover-detail-link');
    expect(detailButton).toBeInTheDocument();
    act(() => {
      detailButton.click();
    });

    expect(navigateMock).toHaveBeenCalledTimes(1);
    expect(navigateMock).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten/$id',
      params: { einsatzId: 'einsatz-42', id: 'posten-a' },
    });
    // Popover wurde vor der Navigation geschlossen.
    expect(screen.queryByTestId('map-popup')).toBeNull();
  });

  it('Story 4.4: focus="sicherungsposten:<id>" triggert flyTo mit korrekter Koordinate für coordinate-Posten', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A, POSTEN_ADDRESS], isPending: false, isError: false }));
    setup({ focus: 'sicherungsposten:posten-a' });

    expect(mapFlyToSpy).toHaveBeenCalledTimes(1);
    expect(mapFlyToSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        center: [10.5, 50.3],
        zoom: 15,
      }),
    );
  });

  it('Story 4.4: focus für address-only-Posten triggert KEINEN flyTo (AC9, silent)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A, POSTEN_ADDRESS], isPending: false, isError: false }));
    setup({ focus: 'sicherungsposten:posten-c' });

    expect(mapFlyToSpy).not.toHaveBeenCalled();
  });

  it('Story 4.4: focus mit anderem Schema (z. B. zone:) wird silent ignoriert', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup({ focus: 'zone:foo' });

    expect(mapFlyToSpy).not.toHaveBeenCalled();
  });

  it('Story 4.4: Highlight-Marker wird gerendert nach FlyTo und verschwindet nach 1.5 s', () => {
    vi.useFakeTimers();
    try {
      listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
      const { container } = setup({ focus: 'sicherungsposten:posten-a' });

      // Highlight-Ring ist initial gerendert.
      expect(container.querySelector('[data-testid="sicherungsposten-highlight-ring"]')).not.toBeNull();

      // Nach 1.5 s ausgeblendet.
      act(() => {
        vi.advanceTimersByTime(1500);
      });
      expect(container.querySelector('[data-testid="sicherungsposten-highlight-ring"]')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it('verwendet die exportierte Layer-ID-Konstante (für Story-4.4-Wiederverwendung)', () => {
    listMock.current = vi.fn(() => ({ data: [POSTEN_COORDINATE_A], isPending: false, isError: false }));
    setup();
    const layerProps = layerSpy.mock.lastCall?.[0] as { id: string; layout: Record<string, unknown> };
    expect(layerProps.id).toBe(SICHERUNGSPOSTEN_LAYER_ID);
    expect(layerProps.layout['icon-image']).toBe(SICHERUNGSPOSTEN_MARKER_IMAGE);
  });
});
