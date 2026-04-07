import { MAP_DEFAULTS, getDwdWmsTileUrl } from '@/features/lagekarte/utils/map-config';
import { useMapLayer } from '@/features/lagekarte/hooks/use-map-layer';
import { useMapDetail } from '@/features/lagekarte/hooks/use-map-detail';
import { useNinaMapData } from '@/features/lagekarte/api/use-nina-map-data';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import 'maplibre-gl/dist/maplibre-gl.css';
import type * as React from 'react';
import { useRef, useState } from 'react';
import { Layer, Map, NavigationControl, Source } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { MapLayerSwitcher } from '../../molecules/MapLayerSwitcher.molecule';
import { MapDetailPopup } from '../../molecules/MapDetailPopup.molecule';
import { MapDetailPanel } from '../../molecules/MapDetailPanel.molecule';
import { NinaGeoJsonLayer } from '../../molecules/NinaGeoJsonLayer.molecule';
import '@/features/lagekarte/detail-providers';
import './lagekarte-view.css';

/** Stabile Referenz für DWD WMS-Tile-URL (verhindert unnötige Source-Neuregistrierungen) */
const DWD_TILE_URL = [getDwdWmsTileUrl()];

export type LagekarteMode = 'standard' | 'fullscreen' | 'presentation';

export type LagekarteSearchParams = {
  mode?: LagekarteMode;
};

interface LagekarteViewProps {
  einsatzId: string;
  mode?: LagekarteMode;
}

export const LagekarteView: React.FC<LagekarteViewProps> = ({ einsatzId, mode = 'standard' }) => {
  const { resolvedStyle, selectedBaseLayer, dwdOverlayEnabled, availableLayers, ninaOverlays } = useMapLayer(einsatzId);
  const { data: ninaGeoJson } = useNinaMapData();
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef<MapRef | null>(null);
  const { featureInfo, isPanelOpen, isLoading: isDetailLoading, handleMapClick, openPanel, closePanel, clearSelection } = useMapDetail(mapRef);

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg', mode === 'standard' && 'h-[600px] md:h-[calc(100vh-180px)]', (mode === 'fullscreen' || mode === 'presentation') && 'h-screen')}>
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-panel/80">
          <Spinner type="ring" size="lg" />
        </div>
      )}

      {/* Loading-Indikator für Feature-Abfrage */}
      {isDetailLoading && (
        <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-panel px-3 py-1.5 text-sm text-text-muted shadow-lg">
            <Spinner type="ring" size="sm" />
            Informationen werden abgefragt…
          </div>
        </div>
      )}

      <Map
        ref={mapRef}
        initialViewState={{
          longitude: MAP_DEFAULTS.longitude,
          latitude: MAP_DEFAULTS.latitude,
          zoom: MAP_DEFAULTS.zoom,
        }}
        style={{ width: '100%', height: '100%' }}
        mapStyle={resolvedStyle}
        onClick={handleMapClick}
        cursor={isDetailLoading ? 'wait' : undefined}
        onLoad={() => setIsLoading(false)}
        aria-label="Lagekarte"
      >
        <NavigationControl position="top-right" />

        {dwdOverlayEnabled && (
          <Source id="dwd-warnungen" type="raster" tiles={DWD_TILE_URL} tileSize={256}>
            <Layer id="dwd-warnungen-layer" type="raster" paint={{ 'raster-opacity': 0.6 }} />
          </Source>
        )}

        {/* NINA Warnungen GeoJSON Layer */}
        {ninaGeoJson && <NinaGeoJsonLayer data={ninaGeoJson} ninaOverlays={ninaOverlays} />}

        {/* Detail-Popup am Klick-Punkt */}
        {featureInfo && !isPanelOpen && <MapDetailPopup info={featureInfo} onShowDetails={openPanel} onClose={clearSelection} />}
      </Map>

      <MapLayerSwitcher availableLayers={availableLayers} selectedBaseLayer={selectedBaseLayer} dwdOverlayEnabled={dwdOverlayEnabled} ninaOverlays={ninaOverlays} />

      {/* Detail-Panel (Slide-In von rechts) */}
      <MapDetailPanel info={featureInfo} isOpen={isPanelOpen} onClose={closePanel} />
    </div>
  );
};
