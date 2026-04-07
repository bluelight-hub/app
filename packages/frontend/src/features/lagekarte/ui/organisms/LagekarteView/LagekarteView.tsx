import { MAP_DEFAULTS, getDwdWmsTileUrl } from '@/features/lagekarte/utils/map-config';
import { useMapLayer } from '@/features/lagekarte/hooks/use-map-layer';
import { useMapDetail } from '@/features/lagekarte/hooks/use-map-detail';
import { useNinaMapData } from '@/features/lagekarte/api/use-nina-map-data';
import { useDrawControl } from '@/features/lagekarte/hooks/use-draw-control';
import { useLagekartePermissions } from '@/features/lagekarte/hooks/use-lagekarte-permissions';
import { useOsmMarkierung } from '@/features/lagekarte/hooks/use-osm-markierung';
import { drawStore } from '@/features/lagekarte/stores/draw.store';
import { DEFAULT_DRAWING_STYLE } from '@/features/lagekarte/drawing/types';
import type { DrawingStyle } from '@/features/lagekarte/drawing/types';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import 'maplibre-gl/dist/maplibre-gl.css';
import type * as React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Layer, Map, NavigationControl, Popup, Source } from 'react-map-gl/maplibre';
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre';
import { useStore } from '@tanstack/react-store';
import { MapLayerSwitcher } from '../../molecules/MapLayerSwitcher.molecule';
import { MapDetailPopup } from '../../molecules/MapDetailPopup.molecule';
import { MapDetailPanel } from '../../molecules/MapDetailPanel.molecule';
import { DrawToolbar } from '../../molecules/DrawToolbar.molecule';
import { DrawStylePanel } from '../../molecules/DrawStylePanel.molecule';
import { OsmMarkierungPopup } from '../../molecules/OsmMarkierungPopup.molecule';
import { FullscreenCloseButton } from '../FullscreenCloseButton/FullscreenCloseButton';
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
  const { results, coordinate, panelIndex, isPanelOpen, isLoading: isDetailLoading, handleMapClick, openPanel, navigatePanel, closePanel, clearSelection } = useMapDetail(mapRef);

  // Berechtigungen
  const { canDraw } = useLagekartePermissions();

  // Draw-Store State
  const drawMode = useStore(drawStore, (s) => s.drawMode);
  const selectedFeatureIds = useStore(drawStore, (s) => s.selectedFeatureIds);

  // Map-Ladezustand
  const isMapLoaded = !isLoading;

  // Draw-Control (Kern-Hook)
  const { undo, redo, canUndo, canRedo, deleteSelected, setMode, drawRef, scheduleAutoSave } = useDrawControl({ mapRef, einsatzId, canDraw, isMapLoaded });

  // OSM-Markierung (nur bei Vektor-Basislayer)
  const isVectorBaseLayer = selectedBaseLayer === 'osm';
  const { handleOsmClick, pendingOsmMark, confirmOsmMark, cancelOsmMark } = useOsmMarkierung({ mapRef, drawRef, isVectorBaseLayer });

  // Style-Panel State
  const [activeStyle, setActiveStyle] = useState<DrawingStyle>(DEFAULT_DRAWING_STYLE);

  // I4: Stil des selektierten Features in das StylePanel laden
  useEffect(() => {
    if (selectedFeatureIds.length === 0) return;
    const draw = drawRef.current;
    if (!draw) return;
    const feature = draw.get(selectedFeatureIds[0]);
    if (!feature?.properties) return;
    const props = feature.properties;
    setActiveStyle((prev) => ({
      ...prev,
      ...(props.color && { color: props.color }),
      ...(props.fillColor && { fillColor: props.fillColor }),
      ...(props.strokeWidth != null && { strokeWidth: props.strokeWidth }),
      ...(props.fillOpacity != null && { fillOpacity: props.fillOpacity }),
      ...(props.strokeDasharray && { strokeDasharray: props.strokeDasharray }),
    }));
  }, [selectedFeatureIds, drawRef]);

  // Label des selektierten Features lesen
  const selectedFeatureLabel = useMemo(() => {
    if (selectedFeatureIds.length === 0 || !drawRef.current) return undefined;
    const feature = drawRef.current.get(selectedFeatureIds[0]);
    return feature?.properties?.label as string | undefined;
  }, [selectedFeatureIds, drawRef]);

  /** Stil ändern und auf selektierte Features anwenden */
  const handleStyleChange = useCallback(
    (partial: Partial<DrawingStyle>) => {
      setActiveStyle((prev) => ({ ...prev, ...partial }));
      const draw = drawRef.current;
      if (!draw) return;
      for (const id of selectedFeatureIds) {
        for (const [key, value] of Object.entries(partial)) {
          draw.setFeatureProperty(id, key, value);
        }
      }
      scheduleAutoSave();
    },
    [selectedFeatureIds, drawRef, scheduleAutoSave],
  );

  /** Label ändern und auf selektierte Features anwenden */
  const handleLabelChange = useCallback(
    (label: string) => {
      const draw = drawRef.current;
      if (!draw) return;
      for (const id of selectedFeatureIds) {
        draw.setFeatureProperty(id, 'label', label);
      }
      scheduleAutoSave();
    },
    [selectedFeatureIds, drawRef, scheduleAutoSave],
  );

  /**
   * Kombinierter Klick-Handler: Entscheidet je nach Zeichenmodus,
   * ob Draw, OSM-Markierung oder Detail-Provider den Klick verarbeitet.
   */
  const handleCombinedClick = useCallback(
    (event: MapLayerMouseEvent) => {
      // 1. Im Zeichenmodus: Draw hat Vorrang (MapboxDraw verarbeitet den Klick)
      if (drawMode !== 'idle' && drawMode !== 'select' && drawMode !== 'osm_mark') {
        return;
      }

      // 2. OSM-Markierungsmodus: OSM-Feature-Klick verarbeiten
      if (drawMode === 'osm_mark') {
        handleOsmClick(event);
        return;
      }

      // 3. Idle/Select: Bestehender Detail-Provider-Flow
      handleMapClick(event);
    },
    [drawMode, handleOsmClick, handleMapClick],
  );

  /** Cursor je nach Modus bestimmen */
  const getCursor = () => {
    if (isDetailLoading) return 'wait';
    if (drawMode === 'osm_mark') return 'crosshair';
    if (drawMode !== 'idle' && drawMode !== 'select') return 'crosshair';
    return undefined;
  };

  return (
    <div className={cn('relative w-full overflow-hidden rounded-lg', mode === 'standard' && 'h-[600px] md:h-[calc(100vh-180px)]', (mode === 'fullscreen' || mode === 'presentation') && 'h-screen')}>
      {mode !== 'standard' && <FullscreenCloseButton />}

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
        onClick={handleCombinedClick}
        cursor={getCursor()}
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
        {results.length > 0 && coordinate && !isPanelOpen && <MapDetailPopup results={results} coordinate={coordinate} onShowDetails={openPanel} onClose={clearSelection} />}

        {/* OSM-Markierungs-Popup */}
        {pendingOsmMark && (
          <Popup longitude={pendingOsmMark.coordinate.lng} latitude={pendingOsmMark.coordinate.lat} onClose={cancelOsmMark} closeOnClick={false} anchor="bottom">
            <OsmMarkierungPopup pendingMark={pendingOsmMark} onConfirm={confirmOsmMark} onCancel={cancelOsmMark} />
          </Popup>
        )}
      </Map>

      {/* Draw-Toolbar */}
      {canDraw && (
        <DrawToolbar
          activeMode={drawMode}
          onModeChange={setMode}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          onDeleteSelected={deleteSelected}
          hasSelection={selectedFeatureIds.length > 0}
        />
      )}

      {/* Style-Panel für selektierte Features */}
      <DrawStylePanel style={activeStyle} onStyleChange={handleStyleChange} isVisible={selectedFeatureIds.length > 0 && canDraw} label={selectedFeatureLabel} onLabelChange={handleLabelChange} />

      <MapLayerSwitcher availableLayers={availableLayers} selectedBaseLayer={selectedBaseLayer} dwdOverlayEnabled={dwdOverlayEnabled} ninaOverlays={ninaOverlays} />

      {/* Detail-Panel (Slide-In von rechts) */}
      <MapDetailPanel results={results} panelIndex={panelIndex} isOpen={isPanelOpen} onClose={closePanel} onNavigate={navigatePanel} />
    </div>
  );
};
