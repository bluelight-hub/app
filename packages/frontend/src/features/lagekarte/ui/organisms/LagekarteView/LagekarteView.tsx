import { MAP_DEFAULTS, getDwdWmsTileUrl } from '@/features/lagekarte/utils/map-config';
import { useMapLayer } from '@/features/lagekarte/hooks/use-map-layer';
import { useMapDetail } from '@/features/lagekarte/hooks/use-map-detail';
import { useNinaMapData } from '@/features/lagekarte/api/use-nina-map-data';
import { useLagekarte } from '@/features/lagekarte/api/use-lagekarte';
import { useLagekarteWebSocketStatus } from '@/features/lagekarte/api/use-lagekarte-websocket';
import { useDrawControl } from '@/features/lagekarte/hooks/use-draw-control';
import { useLagekarteSync, type UseLagekarteSyncReturn } from '@/features/lagekarte/hooks/use-lagekarte-sync';
import { useFeatureMeasurement } from '@/features/lagekarte/hooks/use-feature-measurement';
import { useLagekartePermissions } from '@/features/lagekarte/hooks/use-lagekarte-permissions';
import { useOsmMarkierung } from '@/features/lagekarte/hooks/use-osm-markierung';
import { useGamsZonen } from '@/features/lagekarte/hooks/use-gams-zonen';
import { useSnapControl } from '@/features/lagekarte/hooks/use-snap-control';
import { drawStore, toggleSnapEnabled } from '@/features/lagekarte/stores/draw.store';
import { DEFAULT_DRAWING_STYLE } from '@/features/lagekarte/drawing/types';
import type { DrawingStyle, HatchConfig } from '@/features/lagekarte/drawing/types';
import { DEFAULT_HATCH } from '@/features/lagekarte/drawing/types';
import { ensureHatchImage, migrateLegacyFillPattern, reregisterHatchImages } from '@/features/lagekarte/drawing/hatch-patterns';
import { ConnectionStatusBadge } from '../../atoms/ConnectionStatusBadge.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import { bbox } from '@turf/turf';
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
import { DrawShortcutBar } from '../../molecules/DrawShortcutBar.molecule';
import { DrawStylePanel } from '../../molecules/DrawStylePanel.molecule';
import { OsmMarkierungPopup } from '../../molecules/OsmMarkierungPopup.molecule';
import { GamsZonenPanel } from '../../molecules/GamsZonenPanel.molecule';
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
  const { canDraw: canDrawPermission } = useLagekartePermissions();
  // Im Präsentationsmodus darf nicht gezeichnet werden
  const canDraw = mode !== 'presentation' && canDrawPermission;

  // WebSocket-Verbindungsstatus (global, ohne eigene Verbindung)
  const wsIsConnected = useLagekarteWebSocketStatus();

  // Polling-Fallback: 5s Polling wenn WebSocket nicht verbunden ist
  const { data: lagekarteData } = useLagekarte(einsatzId, { refetchInterval: wsIsConnected ? false : 5000 });

  // Draw-Store State
  const drawMode = useStore(drawStore, (s) => s.drawMode);
  const selectedFeatureIds = useStore(drawStore, (s) => s.selectedFeatureIds);
  const isDirectSelect = useStore(drawStore, (s) => s.isDirectSelect);
  const snapEnabled = useStore(drawStore, (s) => s.snapEnabled);

  // Map-Ladezustand
  const isMapLoaded = !isLoading;

  // Style-Panel State (vor useDrawControl, damit activeStyleRef verfügbar ist)
  const [activeStyle, setActiveStyle] = useState<DrawingStyle>(DEFAULT_DRAWING_STYLE);
  const activeStyleRef = useRef<DrawingStyle>(DEFAULT_DRAWING_STYLE);
  useEffect(() => {
    activeStyleRef.current = activeStyle;
  }, [activeStyle]);

  // Remote-Apply-Flag für WebSocket-Sync (verhindert Loop in Draw-Event-Handlern)
  const isRemoteApplyRef = useRef(false);

  // Stabiler sendDelta-Ref: Wird von useDrawControl via Ref gelesen, von useLagekarteSync befüllt.
  // Löst die zirkuläre Abhängigkeit (drawRef → sync → sendDelta → drawControl).
  const sendDeltaRef = useRef<UseLagekarteSyncReturn['sendDelta'] | undefined>(undefined);

  // Draw-Control (Kern-Hook) - liest sendDelta nur via Ref in Event-Handlern
  const { undo, redo, canUndo, canRedo, deleteSelected, setMode, drawRef, scheduleAutoSave } = useDrawControl({
    mapRef,
    einsatzId,
    canDraw,
    isMapLoaded,
    activeStyleRef,
    isRemoteApplyRef,
    sendDelta: (...args) => sendDeltaRef.current?.(...args),
  });

  // WebSocket-Sync (koordiniert WS mit Draw-Control, braucht drawRef von oben)
  const { wsStatus, sendDelta } = useLagekarteSync({ einsatzId, drawRef, isRemoteApplyRef, enabled: mode !== 'presentation' });

  // sendDelta-Ref aktualisieren sobald verfügbar
  useEffect(() => {
    sendDeltaRef.current = sendDelta;
  }, [sendDelta]);

  // OSM-Markierung (nur bei Vektor-Basislayer)
  const isVectorBaseLayer = selectedBaseLayer === 'osm';
  const { handleOsmClick, pendingOsmMark, confirmOsmMark, cancelOsmMark } = useOsmMarkierung({ mapRef, drawRef, isVectorBaseLayer });

  // GAMS-Zonen (konzentrische Gefahrenzonen)
  const { pendingGamsCenter, confirmiereGamsZonen, abbrechenGamsZonen } = useGamsZonen({ mapRef, drawRef, isMapLoaded, scheduleAutoSave });

  // Node-Snapping
  useSnapControl({ mapRef, drawRef, isMapLoaded });

  // Feature-Messungen (Fläche, Länge, Koordinaten)
  const { selectedMeasurement, liveMeasurement } = useFeatureMeasurement({ mapRef, drawRef, isMapLoaded });

  // I4: Stil des selektierten Features in das StylePanel laden
  useEffect(() => {
    if (selectedFeatureIds.length === 0) return;
    const draw = drawRef.current;
    if (!draw) return;
    const feature = draw.get(selectedFeatureIds[0]);
    if (!feature?.properties) return;
    const props = feature.properties;

    // Hatch-Config wiederherstellen (neues Format oder Legacy-Migration)
    let hatch: HatchConfig = { ...DEFAULT_HATCH };
    if (props.hatch) {
      try {
        hatch = typeof props.hatch === 'string' ? JSON.parse(props.hatch) : props.hatch;
      } catch {
        // Ungültiges JSON — Default beibehalten
      }
    } else if (props.fillPattern) {
      const migrated = migrateLegacyFillPattern(props.fillPattern);
      if (migrated) hatch = migrated;
    }

    setActiveStyle((prev) => ({
      ...prev,
      ...(props.color && { color: props.color }),
      ...(props.fillColor && { fillColor: props.fillColor }),
      ...(props.strokeWidth != null && { strokeWidth: props.strokeWidth }),
      ...(props.fillEnabled != null && { fillEnabled: props.fillEnabled }),
      ...(props.fillOpacity != null && { fillOpacity: props.fillOpacity }),
      ...(props.strokeDasharray && { strokeDasharray: props.strokeDasharray }),
      hatch,
    }));
  }, [selectedFeatureIds, drawRef]);

  // Schraffurmuster bei Style-Wechsel erneut registrieren (style.load entfernt alle Images)
  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || isLoading) return;

    const reregister = () => reregisterHatchImages(map);
    map.on('style.load', reregister);
    return () => {
      map.off('style.load', reregister);
    };
  }, [isLoading]);

  // Präsentationsmodus: fitBounds auf alle Features nach Map-Load
  useEffect(() => {
    if (mode !== 'presentation' || isLoading || !mapRef.current) return;
    const features = lagekarteData?.state;
    if (!features?.features?.length) return;

    try {
      const [minLng, minLat, maxLng, maxLat] = bbox(features);
      mapRef.current.fitBounds(
        [
          [minLng, minLat],
          [maxLng, maxLat],
        ],
        { padding: 60, duration: 1000 },
      );
    } catch {
      // Ungültige Features — fitBounds überspringen
    }
  }, [mode, isLoading, lagekarteData?.state]);

  // Label des selektierten Features (lokaler State für sofortige Input-Reaktion)
  const [selectedFeatureLabel, setSelectedFeatureLabel] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (selectedFeatureIds.length === 0 || !drawRef.current) {
      setSelectedFeatureLabel(undefined);
      return;
    }
    const feature = drawRef.current.get(selectedFeatureIds[0]);
    setSelectedFeatureLabel(feature?.properties?.label as string | undefined);
  }, [selectedFeatureIds, drawRef]);

  const selectedFeatureGeometryType = useMemo(() => {
    if (selectedFeatureIds.length === 0 || !drawRef.current) return undefined;
    const feature = drawRef.current.get(selectedFeatureIds[0]);
    return feature?.geometry?.type as string | undefined;
  }, [selectedFeatureIds, drawRef]);

  /** Stil ändern und auf selektierte Features anwenden */
  const handleStyleChange = useCallback(
    (partial: Partial<DrawingStyle>) => {
      const next = { ...activeStyle, ...partial };
      setActiveStyle(next);
      const draw = drawRef.current;
      if (!draw) return;
      const map = mapRef.current?.getMap();

      for (const id of selectedFeatureIds) {
        for (const [key, value] of Object.entries(partial)) {
          if (key === 'hatch') continue;
          draw.setFeatureProperty(id, key, value);
        }

        if (partial.hatch !== undefined) {
          const hatch = next.hatch;
          draw.setFeatureProperty(id, 'hatch', JSON.stringify(hatch));
          const imageName = ensureHatchImage(map, hatch, next.color);
          draw.setFeatureProperty(id, 'fillPattern', imageName);
        }

        if (partial.color !== undefined && next.hatch.type !== 'none' && next.hatch.color === '') {
          const imageName = ensureHatchImage(map, next.hatch, next.color);
          draw.setFeatureProperty(id, 'fillPattern', imageName);
        }

        const updated = draw.get(id);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (updated) draw.add(updated as any);
      }
      scheduleAutoSave();
    },
    [activeStyle, selectedFeatureIds, drawRef, mapRef, scheduleAutoSave],
  );

  /** Label ändern und auf selektierte Features anwenden */
  const handleLabelChange = useCallback(
    (label: string) => {
      setSelectedFeatureLabel(label);
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

      {/* WebSocket-Verbindungsstatus (im Präsentationsmodus nicht anzeigen) */}
      {mode !== 'presentation' && <ConnectionStatusBadge status={wsStatus} className="absolute right-3 bottom-10 z-20" />}

      {/* Loading-Indikator für Feature-Abfrage */}
      {isDetailLoading && (
        <div className="absolute top-4 left-1/2 z-20 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-lg border border-border-subtle bg-surface-panel px-3 py-1.5 text-sm text-text-muted shadow-lg">
            <Spinner type="ring" size="sm" />
            Informationen werden abgefragt…
          </div>
        </div>
      )}

      {/* Präsentationsmodus-Label */}
      {mode === 'presentation' && (
        <div className="absolute bottom-4 left-4 z-20 rounded-lg border border-border-subtle bg-surface-panel/90 px-3 py-1.5 text-xs text-text-muted shadow-sm backdrop-blur-sm">
          Präsentationsmodus
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

        {/* GAMS-Zonen-Konfiguration */}
        {pendingGamsCenter && (
          <Popup longitude={pendingGamsCenter[0]} latitude={pendingGamsCenter[1]} onClose={abbrechenGamsZonen} closeOnClick={false} anchor="bottom">
            <GamsZonenPanel onConfirm={confirmiereGamsZonen} onCancel={abbrechenGamsZonen} />
          </Popup>
        )}
      </Map>

      {/* Draw-Toolbar */}
      {canDraw && (
        <>
          <DrawToolbar activeMode={drawMode} onModeChange={setMode} />
          <DrawShortcutBar
            activeMode={drawMode}
            hasSelection={selectedFeatureIds.length > 0}
            canUndo={canUndo}
            canRedo={canRedo}
            isDirectSelect={isDirectSelect}
            onUndo={undo}
            onRedo={redo}
            onDeleteSelected={deleteSelected}
            liveMeasurement={liveMeasurement}
            snapEnabled={snapEnabled}
            onToggleSnap={toggleSnapEnabled}
          />
        </>
      )}

      {/* Style-Panel für selektierte Features */}
      <DrawStylePanel
        style={activeStyle}
        onStyleChange={handleStyleChange}
        isVisible={selectedFeatureIds.length > 0 && canDraw}
        label={selectedFeatureLabel}
        onLabelChange={handleLabelChange}
        geometryType={selectedFeatureGeometryType}
        measurement={selectedMeasurement}
      />

      {mode !== 'presentation' && <MapLayerSwitcher availableLayers={availableLayers} selectedBaseLayer={selectedBaseLayer} dwdOverlayEnabled={dwdOverlayEnabled} ninaOverlays={ninaOverlays} />}

      {/* Detail-Panel (Slide-In von rechts) */}
      <MapDetailPanel results={results} panelIndex={panelIndex} isOpen={isPanelOpen} onClose={closePanel} onNavigate={navigatePanel} />
    </div>
  );
};
