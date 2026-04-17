/**
 * GefahrenzoneLayer (Issue #627, G2)
 *
 * Rendert alle Gefahrenzonen eines Einsatzes auf der Lagekarte. Die Warnstufen-
 * Farben werden im Paint-Expression per `match`-Ausdruck aus der pro-Feature-
 * Property `warnstufe` abgeleitet — unter Nutzung der Ring-1-Tokens (via
 * `getWarnstufeMapStyle`) aus G1.
 */

import { useMemo } from 'react';
import { Layer, Source } from 'react-map-gl/maplibre';
import type { FillLayerSpecification, LineLayerSpecification, MapLayerMouseEvent } from 'react-map-gl/maplibre';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';
import type { WarnstufeValue } from '@/features/gefahrenmatrix/schemas/gefahrenmatrix.schema';
import { getWarnstufeMapStyle } from '@/features/lagekarte/detail-providers/warnstufe-style';

export const GEFAHRENZONE_SOURCE_ID = 'gefahrenzonen';
export const GEFAHRENZONE_FILL_LAYER_ID = 'gefahrenzonen-fill';
export const GEFAHRENZONE_LINE_LAYER_ID = 'gefahrenzonen-line';
export const GEFAHRENZONE_AKUT_GLOW_LAYER_ID = 'gefahrenzonen-akut-glow';

/** Warnstufe, die zum Sortieren/Styling genutzt wird, wenn der Server `null` liefert. */
const DEFAULT_WARNSTUFE: WarnstufeValue = 'KEINE';

function readWarnstufe(zone: GefahrenzoneDto): WarnstufeValue {
  const raw = zone.warnstufe as unknown;
  if (typeof raw === 'string' && ['KEINE', 'NIEDRIG', 'MITTEL', 'HOCH', 'AKUT'].includes(raw)) {
    return raw as WarnstufeValue;
  }
  return DEFAULT_WARNSTUFE;
}

export interface GefahrenzoneLayerProps {
  zonen: GefahrenzoneDto[];
  /**
   * Optional `beforeId` — MapLibre-Layer-Reihenfolge. Wird direkt an die
   * drei `<Layer>`-Komponenten weitergereicht.
   */
  beforeId?: string;
}

/**
 * MapGL-Layer für Gefahrenzonen. Eine einzige GeoJSON-Source, drei Layer:
 * Fill + Line (immer) + Glow (nur AKUT). Pro-Feature-Expressions wählen die
 * Warnstufen-Farbe. Click-Delegation erfolgt zentral via `extractZoneClick`
 * am `MapGL`-`onClick`-Handler im `LagekarteView` (Spec Zeile 214: Click-vs-
 * Draw-Konflikt wird durch Prüfung des `drawContext` im Caller gelöst).
 */
export function GefahrenzoneLayer({ zonen, beforeId }: GefahrenzoneLayerProps) {
  const stylesByStufe = useMemo(
    () => ({
      KEINE: getWarnstufeMapStyle('KEINE'),
      NIEDRIG: getWarnstufeMapStyle('NIEDRIG'),
      MITTEL: getWarnstufeMapStyle('MITTEL'),
      HOCH: getWarnstufeMapStyle('HOCH'),
      AKUT: getWarnstufeMapStyle('AKUT'),
    }),
    [],
  );

  const geojson: GeoJSON.FeatureCollection = useMemo(
    () => ({
      type: 'FeatureCollection',
      features: zonen.map((zone) => {
        const warnstufe = readWarnstufe(zone);
        const geometryFeature = zone.geometry as unknown as GeoJSON.Feature;
        const geometry = (geometryFeature?.geometry ?? zone.geometry) as GeoJSON.Geometry;
        return {
          type: 'Feature',
          id: zone.id,
          properties: {
            zoneId: zone.id,
            warnstufe,
            gefahrentyp: zone.gefahrentyp,
            schutzobjekt: zone.schutzobjekt,
            bezeichnung: zone.bezeichnung ?? null,
          },
          geometry,
        } as GeoJSON.Feature;
      }),
    }),
    [zonen],
  );

  const fillPaint: FillLayerSpecification['paint'] = useMemo(
    () => ({
      'fill-color': [
        'match',
        ['get', 'warnstufe'],
        'KEINE',
        stylesByStufe.KEINE.fillColor,
        'NIEDRIG',
        stylesByStufe.NIEDRIG.fillColor,
        'MITTEL',
        stylesByStufe.MITTEL.fillColor,
        'HOCH',
        stylesByStufe.HOCH.fillColor,
        'AKUT',
        stylesByStufe.AKUT.fillColor,
        stylesByStufe.KEINE.fillColor,
      ],
      'fill-opacity': 1,
    }),
    [stylesByStufe],
  );

  const linePaint: LineLayerSpecification['paint'] = useMemo(
    () => ({
      'line-color': [
        'match',
        ['get', 'warnstufe'],
        'KEINE',
        stylesByStufe.KEINE.strokeColor,
        'NIEDRIG',
        stylesByStufe.NIEDRIG.strokeColor,
        'MITTEL',
        stylesByStufe.MITTEL.strokeColor,
        'HOCH',
        stylesByStufe.HOCH.strokeColor,
        'AKUT',
        stylesByStufe.AKUT.strokeColor,
        stylesByStufe.KEINE.strokeColor,
      ],
      'line-width': ['match', ['get', 'warnstufe'], 'AKUT', stylesByStufe.AKUT.strokeWidth, 'HOCH', stylesByStufe.HOCH.strokeWidth, stylesByStufe.NIEDRIG.strokeWidth],
    }),
    [stylesByStufe],
  );

  /**
   * Dashed Stroke ausschließlich für KEINE via eigenem Layer mit Filter —
   * MapLibre v5 validiert `line-dasharray` strikt (min. 2 Elemente, even-length,
   * keine `case`-Expression im Paint-Root zulaessig auf manchen Stilen).
   * Ein separater Layer mit statischem dasharray ist die stabilste Variante.
   */
  const lineDashPaintKeine: LineLayerSpecification['paint'] = useMemo(
    () => ({
      'line-color': stylesByStufe.KEINE.strokeColor,
      'line-width': 2,
      'line-dasharray': [4, 4],
    }),
    [stylesByStufe],
  );

  const glowPaint: LineLayerSpecification['paint'] = useMemo(
    () => ({
      'line-color': stylesByStufe.AKUT.glowColor ?? stylesByStufe.AKUT.strokeColor,
      'line-width': stylesByStufe.AKUT.glowWidth ?? 12,
      'line-blur': 6,
      'line-opacity': 0.75,
    }),
    [stylesByStufe],
  );

  return (
    <Source id={GEFAHRENZONE_SOURCE_ID} type="geojson" data={geojson}>
      <Layer id={GEFAHRENZONE_AKUT_GLOW_LAYER_ID} type="line" filter={['==', ['get', 'warnstufe'], 'AKUT']} paint={glowPaint} beforeId={beforeId} />
      <Layer id={GEFAHRENZONE_FILL_LAYER_ID} type="fill" paint={fillPaint} beforeId={beforeId} />
      <Layer id={GEFAHRENZONE_LINE_LAYER_ID} type="line" filter={['!=', ['get', 'warnstufe'], 'KEINE']} paint={linePaint} beforeId={beforeId} />
      <Layer id={`${GEFAHRENZONE_LINE_LAYER_ID}-keine`} type="line" filter={['==', ['get', 'warnstufe'], 'KEINE']} paint={lineDashPaintKeine} beforeId={beforeId} />
    </Source>
  );
}

/**
 * Hilfs-Extraktor für Map-Click-Delegation: liefert zoneId + Click-Koordinate,
 * wenn das Click-Event eine Gefahrenzone trifft — oder `null`. Gedacht für
 * Integration in den zentralen Map-`onClick` von `LagekarteView`.
 */
export function extractZoneClick(event: MapLayerMouseEvent): { zoneId: string; coordinates: { lng: number; lat: number } } | null {
  const feature = event.features?.find((f) => f.layer?.id === GEFAHRENZONE_FILL_LAYER_ID);
  if (!feature) return null;
  const zoneId = (feature.properties as { zoneId?: string } | undefined)?.zoneId;
  if (!zoneId) return null;
  return {
    zoneId,
    coordinates: { lng: event.lngLat.lng, lat: event.lngLat.lat },
  };
}
