import type { PoiDto } from '@/shared';
import { LngLatBounds } from 'maplibre-gl';
import type { MapRef } from 'react-map-gl/maplibre';
import { useEffect } from 'react';
import { MAP_DEFAULTS } from '../utils/map-config';

/**
 * Custom Hook zum automatischen Zoomen der Karte auf alle POIs
 *
 * @param pois - Array von POIs die auf der Karte dargestellt werden sollen
 * @param mapRef - React Ref zur MapLibre Map-Instanz
 */
export const useMapBounds = (pois: PoiDto[] | undefined, mapRef: React.RefObject<MapRef | null>): void => {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!pois || pois.length === 0) {
      map.flyTo({
        center: [MAP_DEFAULTS.longitude, MAP_DEFAULTS.latitude],
        zoom: MAP_DEFAULTS.zoom,
      });
      return;
    }

    const validPois = pois.filter((poi) => poi.coordinate && !Number.isNaN(poi.coordinate.lat) && !Number.isNaN(poi.coordinate.lng));

    if (validPois.length === 0) {
      map.flyTo({
        center: [MAP_DEFAULTS.longitude, MAP_DEFAULTS.latitude],
        zoom: MAP_DEFAULTS.zoom,
      });
      return;
    }

    const bounds = new LngLatBounds();
    for (const poi of validPois) {
      bounds.extend([poi.coordinate.lng, poi.coordinate.lat]);
    }

    map.fitBounds(bounds, {
      padding: 50,
      maxZoom: 15,
    });
  }, [pois, mapRef]);
};
