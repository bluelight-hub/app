import { useMyEinsatzTeilnahme } from '@/features/einsatz';
import { useEtb } from '@/features/etb';
import {
  ClusteredPoiLayer,
  DrawingLayer,
  type DrawingTool,
  DrawingToolbar,
  FullscreenCloseButton,
  LagekarteToolbar,
  type Layer,
  LayerErrorBoundary,
  LayerToggle,
  MapToolbarToggle,
  PoiPlacementControl,
  PoiPlacementModal,
  ShapeLabelModal,
} from '@/features/lagekarte';
import { useLagekarte, usePois } from '@/features/lagekarte/api';
import { lagekarteStore } from '@/features/lagekarte/stores/lagekarte-state.store';
import { useLagekarteAutoSave, usePlacementMode, useMapBounds } from '@/features/lagekarte/hooks';
import type { PoiType, ShapeType } from '@/features/lagekarte/utils';
import { captureMapScreenshot, MAP_STYLES } from '@/features/lagekarte/utils';
import { MAP_DEFAULTS } from '@/features/lagekarte/utils/map-config';
import { api } from '@/shared';
import { useColorMode } from '@/shared/hooks/use-color-mode';
import { logger } from '@/shared/lib/logger';
import { Button } from '@/shared/ui/atoms/button.atom';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { cn } from '@/shared/ui/cn';
import type * as GeoJSON from 'geojson';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PiWarning } from 'react-icons/pi';
import { Map, NavigationControl } from 'react-map-gl/maplibre';
import type { MapRef } from 'react-map-gl/maplibre';
import { toast } from 'sonner';
import { FahrzeugPoiLayer } from '../layers/FahrzeugPoiLayer';
import { PropertyPanel, type ShapeProperties } from '../PropertyPanel';
import './lagekarte-view.css';

export type LagekarteMode = 'standard' | 'fullscreen' | 'presentation';

export type LagekarteSearchParams = {
  mode?: LagekarteMode;
};

interface LagekarteViewProps {
  einsatzId: string;
  mode?: LagekarteMode;
}

export const LagekarteView: React.FC<LagekarteViewProps> = ({ einsatzId, mode = 'standard' }) => {
  const { resolvedColorMode } = useColorMode();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const mapRef = useRef<MapRef>(null);

  // Fullscreen-Indikator State
  const [showFullscreenBadge, setShowFullscreenBadge] = useState(mode === 'fullscreen');

  // POI-Placement State
  const { selectedType, isPlacementActive, activatePlacementMode, deactivatePlacementMode } = usePlacementMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedCoordinates, setClickedCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  // Drawing State
  const [selectedDrawingTool, setSelectedDrawingTool] = useState<DrawingTool>('select');
  const [isShapeLabelModalOpen, setIsShapeLabelModalOpen] = useState(false);
  const [currentShape, setCurrentShape] = useState<GeoJSON.Feature | null>(null);
  const [shapeToUpdate, setShapeToUpdate] = useState<GeoJSON.Feature | null>(null);

  // Property Panel State
  const [selectedShape, setSelectedShape] = useState<GeoJSON.Feature | null>(null);
  const [showPropertyPanel, setShowPropertyPanel] = useState(false);

  // Layer-Visibility State
  const [layers, setLayers] = useState<Layer[]>([
    { name: 'poi', label: 'POI-Marker', visible: true },
    { name: 'drawing', label: 'Zeichnungen', visible: true },
    { name: 'fahrzeuge', label: 'Fahrzeuge', visible: true },
  ]);

  // Tools-Visibility State
  const [isToolsOpen, setIsToolsOpen] = useState(false);

  // ETB-Export State
  const [isExportingToEtb, setIsExportingToEtb] = useState(false);

  // Lagekarte-Daten
  const { data: lagekarte } = useLagekarte(einsatzId);
  const { data: pois } = usePois(lagekarte?.id);

  // ETB
  const { data: teilnahmeData } = useMyEinsatzTeilnahme(einsatzId);
  const hasActiveTeilnahme = !!teilnahmeData?.data?.einsatzPersonId;
  const { data: etbData, refetch: refetchEtb, isLoading: isEtbLoading } = useEtb({ einsatzId, enabled: hasActiveTeilnahme });

  // Auto-Save Hook
  const { triggerAutoSave } = useLagekarteAutoSave(einsatzId);

  // Map-Bounds (Auto-Zoom auf POIs)
  useMapBounds(pois, mapRef);

  // Map Style basierend auf Theme
  const mapStyle = resolvedColorMode === 'dark' ? MAP_STYLES.dark : MAP_STYLES.light;

  // Fullscreen-Badge Auto-Hide
  React.useEffect(() => {
    if (mode === 'fullscreen' && showFullscreenBadge) {
      const timer = setTimeout(() => setShowFullscreenBadge(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [mode, showFullscreenBadge]);

  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
  };

  const handlePoiTypeSelect = (type: PoiType) => {
    activatePlacementMode(type);
  };

  const handleMapClick = useCallback(
    (e: maplibregl.MapMouseEvent) => {
      if (!isPlacementActive || !selectedType) return;

      const { lng, lat } = e.lngLat;
      setClickedCoordinates({ lat, lon: lng });
      setIsModalOpen(true);
    },
    [isPlacementActive, selectedType],
  );

  const handleModalClose = () => {
    setIsModalOpen(false);
    setClickedCoordinates(null);
    deactivatePlacementMode();
  };

  const handleDrawingToolSelect = useCallback((tool: DrawingTool) => {
    setSelectedDrawingTool(tool);
  }, []);

  const handleShapesChange = useCallback(
    (shapes: GeoJSON.FeatureCollection) => {
      triggerAutoSave(shapes);
    },
    [triggerAutoSave],
  );

  const handleShapeCreated = useCallback((shape: GeoJSON.Feature) => {
    const isTextMarker = shape.geometry.type === 'Point';
    if (!isTextMarker) {
      setCurrentShape(shape);
      setIsShapeLabelModalOpen(true);
    }
  }, []);

  const handleShapeLimitReached = useCallback(() => {
    toast.error('Maximale Anzahl erreicht', {
      description: 'Es können maximal 100 Zeichnungen pro Lagekarte erstellt werden.',
    });
  }, []);

  const handleShapeLabelSave = useCallback(
    (label: string, type: ShapeType) => {
      if (!currentShape) return;

      const updatedShape: GeoJSON.Feature = {
        ...currentShape,
        properties: { ...currentShape.properties, label, type },
      };

      setShapeToUpdate(updatedShape);
      setIsShapeLabelModalOpen(false);
      setCurrentShape(null);
    },
    [currentShape],
  );

  const handleShapeUpdateComplete = useCallback(() => {
    setShapeToUpdate(null);
  }, []);

  const handlePropertiesChange = useCallback((shapeId: string, properties: Partial<ShapeProperties>) => {
    // Live-State aus Store lesen, nicht aus Query-Cache
    const currentFeatures = lagekarteStore.state.shapes.features;
    const existingFeature = currentFeatures.find((f) => f.properties?.id === shapeId);
    if (!existingFeature) return;

    const updatedShape: GeoJSON.Feature = {
      ...existingFeature,
      properties: { ...existingFeature.properties, ...properties },
    };

    setShapeToUpdate(updatedShape);
    setSelectedShape(updatedShape);
  }, []);

  const handleShapeSelected = useCallback((shape: GeoJSON.Feature | null) => {
    setSelectedShape(shape);
    setShowPropertyPanel(!!shape);
  }, []);

  const handleLayerToggle = useCallback((layerName: string) => {
    setLayers((prev) => prev.map((layer) => (layer.name === layerName ? { ...layer, visible: !layer.visible } : layer)));
  }, []);

  const handleExportToEtb = useCallback(async () => {
    if (isEtbLoading) {
      toast.error('Fehler beim Export', { description: 'ETB-Daten werden noch geladen. Bitte warten.' });
      return;
    }

    const mapContainer = mapRef.current?.getContainer();
    if (!mapContainer) {
      toast.error('Fehler beim Export', { description: 'Karte noch nicht geladen' });
      return;
    }

    setIsExportingToEtb(true);

    let targetEtbId = etbData?.id;
    if (!targetEtbId) {
      const refetchResult = await refetchEtb();
      targetEtbId = refetchResult.data?.id;

      if (!targetEtbId) {
        toast.error('Export nicht möglich', {
          description: 'Das Einsatztagebuch wurde noch nicht erstellt. Bitte öffne zuerst das ETB.',
        });
        setIsExportingToEtb(false);
        return;
      }
    }

    let uploadedScreenshotUrl: string | null = null;

    try {
      const screenshotBlob = await captureMapScreenshot(mapContainer);
      const screenshotUrl = URL.createObjectURL(screenshotBlob);
      const img = new Image();
      img.src = screenshotUrl;

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load screenshot image'));
      });

      const screenshotWidth = img.naturalWidth;
      const screenshotHeight = img.naturalHeight;
      URL.revokeObjectURL(screenshotUrl);

      const uploadResponse = await api.lagekarte().lagekarteControllerUploadScreenshotVAlpha({
        einsatzId,
        file: screenshotBlob,
      });

      uploadedScreenshotUrl = uploadResponse.data.url as string;

      try {
        await api.etb().etbCqrsControllerAddEintragVAlpha({
          etbId: targetEtbId,
          addEintragDto: {
            kategorie: 'DOKUMENTATION',
            text: 'Lagekarten-Screenshot erstellt',
            einsatzId,
            metadata: {
              screenshot: { url: uploadedScreenshotUrl, width: screenshotWidth, height: screenshotHeight },
            },
          },
        });
      } catch (etbError) {
        logger.error('ETB entry creation failed', etbError);
        if (uploadedScreenshotUrl) {
          try {
            const url = new URL(uploadedScreenshotUrl, window.location.origin);
            const filename = url.pathname.split('/').pop();
            if (filename) {
              await api.lagekarte().lagekarteControllerDeleteScreenshotVAlpha({ einsatzId, filename });
            }
          } catch (cleanupError) {
            logger.error('Failed to cleanup screenshot after ETB error', cleanupError);
          }
        }
        throw etbError;
      }

      toast.success('Screenshot erfolgreich ins ETB exportiert', {
        description: 'Der Screenshot wurde als ETB-Eintrag gespeichert',
      });
    } catch (error) {
      logger.error('ETB export failed', error);
      toast.error('Fehler beim ETB-Export', {
        description: error instanceof Error ? error.message : 'Unbekannter Fehler',
        action: { label: 'Retry', onClick: () => handleExportToEtb() },
      });
    } finally {
      setIsExportingToEtb(false);
    }
  }, [etbData, einsatzId, refetchEtb, isEtbLoading]);

  if (hasError) {
    return (
      <div
        className={cn(
          'w-full overflow-hidden rounded-lg',
          'flex flex-col items-center justify-center',
          'bg-surface-raised',
          'border-2 border-dashed border-border-subtle',
          mode === 'standard' && 'h-[600px] md:h-[calc(100vh-120px)]',
          (mode === 'fullscreen' || mode === 'presentation') && 'h-screen',
        )}
        role="alert"
        aria-live="assertive"
      >
        <PiWarning className="mb-4 h-12 w-12 text-status-warning-text" />
        <h3 className="mb-2 text-lg font-semibold text-text-primary">Karte konnte nicht geladen werden</h3>
        <p className="mb-4 text-center text-sm text-text-muted">
          Die Karten-Tiles konnten nicht vom Server geladen werden.
          <br />
          Bitte überprüfen Sie Ihre Internetverbindung.
        </p>
        <Button intent="primary" appearance="filled" size="md" onClick={handleRetry}>
          Erneut versuchen
        </Button>
      </div>
    );
  }

  return (
    <>
      {mode === 'fullscreen' && <FullscreenCloseButton />}

      {mode === 'fullscreen' && showFullscreenBadge && (
        <output
          className={cn(
            'fixed top-4 left-4 z-[9999]',
            'flex items-center gap-2 rounded-lg px-4 py-2',
            'border border-status-info-border bg-status-info-surface/90 backdrop-blur-lg',
            'shadow-lg',
            'transition-opacity duration-500',
            showFullscreenBadge ? 'opacity-100' : 'opacity-0',
          )}
          aria-label="Vollbildmodus aktiv"
        >
          <div className="h-2 w-2 animate-pulse rounded-full bg-status-info-text" />
          <span className="text-sm font-medium text-status-info-text">Vollbildmodus</span>
        </output>
      )}

      {isModalOpen && selectedType && clickedCoordinates && lagekarte && (
        <PoiPlacementModal isOpen={isModalOpen} onClose={handleModalClose} poiType={selectedType} coordinates={clickedCoordinates} einsatzId={einsatzId} lagekarteId={lagekarte.id} />
      )}

      {isShapeLabelModalOpen && currentShape && <ShapeLabelModal isOpen={isShapeLabelModalOpen} onClose={() => setIsShapeLabelModalOpen(false)} shape={currentShape} onSave={handleShapeLabelSave} />}

      {showPropertyPanel && (
        <PropertyPanel
          selectedShape={selectedShape}
          onPropertiesChange={handlePropertiesChange}
          onClose={() => {
            setShowPropertyPanel(false);
            setSelectedShape(null);
          }}
        />
      )}

      <div className={cn('relative w-full overflow-hidden rounded-lg', mode === 'standard' && 'h-[600px] md:h-[calc(100vh-180px)]', (mode === 'fullscreen' || mode === 'presentation') && 'h-screen')}>
        {mode === 'standard' && (
          <div className="absolute top-40 left-2.5 z-[10] hidden flex-col gap-2 md:flex">
            <MapToolbarToggle isOpen={isToolsOpen} onToggle={setIsToolsOpen} />
            {isToolsOpen && (
              <PoiPlacementControl
                onPoiTypeSelect={handlePoiTypeSelect}
                onCancel={deactivatePlacementMode}
                selectedType={selectedType}
                isPlacementActive={isPlacementActive}
                isModalOpen={isModalOpen}
              />
            )}
            {isToolsOpen && <DrawingToolbar onToolSelect={handleDrawingToolSelect} selectedTool={selectedDrawingTool} />}
          </div>
        )}

        {mode === 'standard' && (
          <div className="absolute top-2.5 right-2.5 z-[10]">
            <LagekarteToolbar onEtbExportClick={handleExportToEtb} isExportingToEtb={isExportingToEtb || isEtbLoading} />
          </div>
        )}

        {mode === 'standard' && <LayerToggle layers={layers} onToggle={handleLayerToggle} />}

        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface-panel/80">
            <Spinner type="ring" size="lg" />
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
          mapStyle={mapStyle}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setHasError(true);
            setIsLoading(false);
          }}
          onClick={isPlacementActive ? handleMapClick : undefined}
          cursor={isPlacementActive ? 'crosshair' : undefined}
          aria-label="Lagekarte"
        >
          <NavigationControl position="top-right" />

          {layers.find((l) => l.name === 'poi')?.visible && (
            <LayerErrorBoundary layerName="POI-Layer">
              <ClusteredPoiLayer lagekarteId={lagekarte?.id} mapRef={mapRef} />
            </LayerErrorBoundary>
          )}

          {layers.find((l) => l.name === 'drawing')?.visible && !!lagekarte && (
            <DrawingLayer
              mapRef={mapRef}
              einsatzId={einsatzId}
              selectedTool={selectedDrawingTool}
              initialState={lagekarte?.state}
              shapeToUpdate={shapeToUpdate}
              onShapesChange={handleShapesChange}
              onShapeCreated={handleShapeCreated}
              onShapeLimitReached={handleShapeLimitReached}
              onShapeUpdateComplete={handleShapeUpdateComplete}
              onShapeSelected={handleShapeSelected}
              isPlacementModeActive={isPlacementActive}
            />
          )}

          {layers.find((l) => l.name === 'fahrzeuge')?.visible && (
            <LayerErrorBoundary layerName="Fahrzeug-Layer">
              <FahrzeugPoiLayer einsatzId={einsatzId} />
            </LayerErrorBoundary>
          )}
        </Map>
      </div>
    </>
  );
};
