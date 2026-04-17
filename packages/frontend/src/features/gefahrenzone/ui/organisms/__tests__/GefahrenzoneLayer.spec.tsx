import { describe, it, expect, vi } from 'vitest';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import { extractZoneClick, GEFAHRENZONE_FILL_LAYER_ID } from '../GefahrenzoneLayer';

vi.mock('react-map-gl/maplibre', () => ({
  Source: () => null,
  Layer: () => null,
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
