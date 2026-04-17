import { describe, it, expect, vi } from 'vitest';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { extractZoneClick, GEFAHRENZONE_FILL_LAYER_ID } from '../GefahrenzoneLayer';

// Wir fangen die Layer-Props ein, damit Tests die Paint-Konfiguration inspizieren
// können — MapLibre v5 rejectet `line-dasharray` mit <2 oder ungeraden Elementen
// pro Frame (→ Log-Spam). Der Test verifiziert, dass keine Layer mit invalidem
// Paint gerendert werden.
const layerProps: Array<Record<string, unknown>> = [];

vi.mock('react-map-gl/maplibre', () => ({
  Source: ({ children }: { children?: unknown }) => children ?? null,
  Layer: (props: Record<string, unknown>) => {
    layerProps.push(props);
    return null;
  },
}));

vi.mock('@/features/lagekarte/detail-providers/warnstufe-style', () => ({
  getWarnstufeMapStyle: (warnstufe: string) => ({
    fillColor: `fill-${warnstufe}`,
    strokeColor: `stroke-${warnstufe}`,
    fillOpacity: 1,
    strokeWidth: 2,
    glowColor: warnstufe === 'AKUT' ? 'glow' : undefined,
    glowWidth: warnstufe === 'AKUT' ? 12 : undefined,
  }),
}));

describe('extractZoneClick', () => {
  const baseLngLat = { lng: 10, lat: 50 };

  it('liefert null wenn kein Fill-Feature getroffen wurde', () => {
    const result = extractZoneClick({
      features: [{ layer: { id: 'other-layer' }, properties: { zoneId: 'z-1' } }],
      lngLat: baseLngLat,
    } as unknown as Parameters<typeof extractZoneClick>[0]);
    expect(result).toBeNull();
  });

  it('extrahiert zoneId + Koordinate, wenn ein Fill-Feature getroffen wurde', () => {
    const result = extractZoneClick({
      features: [{ layer: { id: GEFAHRENZONE_FILL_LAYER_ID }, properties: { zoneId: 'z-42' } }],
      lngLat: baseLngLat,
    } as unknown as Parameters<typeof extractZoneClick>[0]);
    expect(result).toEqual({ zoneId: 'z-42', coordinates: { lng: 10, lat: 50 } });
  });

  it('fällt auf null zurück, wenn zoneId nicht vorhanden ist', () => {
    const result = extractZoneClick({
      features: [{ layer: { id: GEFAHRENZONE_FILL_LAYER_ID }, properties: {} }],
      lngLat: baseLngLat,
    } as unknown as Parameters<typeof extractZoneClick>[0]);
    expect(result).toBeNull();
  });
});

describe('GefahrenzoneLayer (smoke)', () => {
  it('rendert ohne Fehler wenn keine Zonen übergeben werden', async () => {
    const { render } = await import('@testing-library/react');
    const { GefahrenzoneLayer } = await import('../GefahrenzoneLayer');
    const { container } = render(<GefahrenzoneLayer zonen={[]} />);
    expect(container).toBeInTheDocument();
  });

  it('rendert nur valide line-dasharray-Arrays (>=2 Elemente, gerade Länge)', async () => {
    layerProps.length = 0;
    const { render } = await import('@testing-library/react');
    const { GefahrenzoneLayer } = await import('../GefahrenzoneLayer');
    render(<GefahrenzoneLayer zonen={[]} />);
    const dashLayers = layerProps.filter((p) => {
      const paint = p.paint as Record<string, unknown> | undefined;
      return paint && 'line-dasharray' in paint;
    });
    // Es sollte mindestens ein Layer mit dasharray existieren (der KEINE-Layer).
    expect(dashLayers.length).toBeGreaterThan(0);
    for (const layer of dashLayers) {
      const paint = layer.paint as Record<string, unknown>;
      const dash = paint['line-dasharray'];
      // Regression-Guard: MapLibre v5 akzeptiert nur statische Arrays mit >=2
      // Elementen und gerader Länge. Kein Case-Branch mit [1].
      expect(Array.isArray(dash)).toBe(true);
      expect((dash as unknown[]).length).toBeGreaterThanOrEqual(2);
      expect((dash as unknown[]).length % 2).toBe(0);
      for (const value of dash as unknown[]) {
        expect(typeof value).toBe('number');
      }
    }
  });

  it('rendert mit AKUT-Zone (Glow-Layer wird mit gefiltertem Paint gerendert)', async () => {
    const { render } = await import('@testing-library/react');
    const { GefahrenzoneLayer } = await import('../GefahrenzoneLayer');
    const zone: GefahrenzoneDto = {
      id: 'z-akut',
      einsatzId: 'e-1',
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
      erstelltVon: 'u-1',
      aktualisiertVon: null,
      erstelltAm: new Date('2026-01-01'),
      aktualisiertAm: new Date('2026-01-01'),
    };
    const { container } = render(<GefahrenzoneLayer zonen={[zone]} />);
    expect(container).toBeInTheDocument();
  });
});
