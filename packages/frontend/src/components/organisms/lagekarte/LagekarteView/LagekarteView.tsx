import { Button } from '@/components/atoms/button.atom';
import { Spinner } from '@/components/atoms/spinner.atom';
import { useColorMode } from '@/hooks/use-color-mode';
import { cn } from '@/utils/cn';
import type React from 'react';
import { useState } from 'react';
import { PiWarning } from 'react-icons/pi';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
import { PoiLayer } from '../layers/PoiLayer';
import { useLagekarte, usePois } from '@/api/hooks/useLagekarteApi';
import { useMapBounds } from './useMapBounds';
import { usePlacementMode } from './usePlacementMode';
import { PoiPlacementControl } from '../controls/PoiPlacementControl';
import { PoiPlacementModal } from '../modals/PoiPlacementModal';
import type { PoiType } from '@/utils/poi-icons';
import './lagekarte-view.css';

/**
 * Props für die LagekarteView-Komponente
 */
interface LagekarteViewProps {
  /**
   * ID des Einsatzes für den die Lagekarte angezeigt wird
   * @remarks Aktuell nicht verwendet, reserviert für zukünftige Features (z.B. Einsatzort-Marker)
   */
  einsatzId: string;
}

/**
 * Error-Handler-Komponente für Tile-Load-Failures
 * Lauscht auf 'tileerror' Events vom Leaflet Map
 */
const TileErrorHandler: React.FC<{ onError: () => void }> = ({ onError }) => {
  useMapEvents({
    tileerror: () => {
      onError();
    },
  });
  return null;
};

/**
 * Map-Click-Handler für POI-Platzierung
 * Öffnet Modal mit Koordinaten wenn Platzierungs-Modus aktiv
 */
const MapClickHandler: React.FC<{
  isPlacementActive: boolean;
  selectedType: PoiType | null;
  onMapClick: (lat: number, lon: number) => void;
}> = ({ isPlacementActive, selectedType, onMapClick }) => {
  useMapEvents({
    click: (e) => {
      if (isPlacementActive && selectedType) {
        const { lat, lng } = e.latlng;
        onMapClick(lat, lng);
      }
    },
  });
  return null;
};

/**
 * Map-Bounds-Controller-Komponente
 * Verwendet useMapBounds Hook um Karte automatisch auf POIs zu zoomen
 */
const MapBoundsController: React.FC<{ einsatzId: string }> = ({ einsatzId }) => {
  const { data: pois } = usePois(einsatzId);
  useMapBounds(pois);
  return null;
};

/**
 * Lagekarte-Komponente zur Darstellung einer interaktiven Karte mit OpenStreetMap-Tiles.
 *
 * Features:
 * - Dark-Mode Support (automatischer Wechsel zwischen OSM und CartoDB Dark Matter)
 * - Mobile-responsive Layout
 * - Deutschland-Zentrum als Default-Position
 * - Error Handling für fehlgeschlagene Tile-Loads
 *
 * @component
 * @example
 * ```tsx
 * <LagekarteView einsatzId="einsatz-123" />
 * ```
 */
export const LagekarteView: React.FC<LagekarteViewProps> = ({ einsatzId }) => {
  const { resolvedColorMode } = useColorMode();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // POI-Placement State
  const { selectedType, isPlacementActive, activatePlacementMode, deactivatePlacementMode } = usePlacementMode();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clickedCoordinates, setClickedCoordinates] = useState<{ lat: number; lon: number } | null>(null);

  // Lagekarte-Daten (für lagekarteId)
  const { data: lagekarteData } = useLagekarte(einsatzId);

  // Tile-URL basierend auf Theme
  const tileUrl = resolvedColorMode === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png' : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';

  const attribution =
    resolvedColorMode === 'dark'
      ? '&copy; <a href="https://carto.com/attributions">CARTO</a> | &copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
      : '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors';

  // Deutschland-Zentrum als Default-Position
  const defaultCenter: [number, number] = [51.1657, 10.4515];
  const defaultZoom = 6;

  /**
   * Handler für Tile-Load-Fehler
   * Setzt Error-State wenn Tiles nicht geladen werden können
   */
  const handleTileError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  /**
   * Reset Error-State und versuche erneut zu laden
   */
  const handleRetry = () => {
    setHasError(false);
    setIsLoading(true);
    // Map wird durch React re-render neu initialisiert
  };

  /**
   * Handler wenn POI-Typ aus Toolbar ausgewählt wird
   */
  const handlePoiTypeSelect = (type: PoiType) => {
    activatePlacementMode(type);
  };

  /**
   * Handler wenn User auf Karte klickt (im Platzierungs-Modus)
   */
  const handleMapClick = (lat: number, lon: number) => {
    setClickedCoordinates({ lat, lon });
    setIsModalOpen(true);
  };

  /**
   * Handler wenn Modal geschlossen wird
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
    setClickedCoordinates(null);
    deactivatePlacementMode();
  };

  // Error-State anzeigen
  if (hasError) {
    return (
      <div
        className={cn(
          'w-full',
          'h-[calc(100vh-120px)] md:h-[600px]', // Mobile: full viewport, Desktop: fixed height
          'overflow-hidden rounded-lg',
          'flex flex-col items-center justify-center',
          'bg-gray-50 dark:bg-gray-800',
          'border-2 border-gray-300 border-dashed dark:border-gray-600',
        )}
        role="alert"
        aria-live="assertive"
      >
        <PiWarning className="mb-4 h-12 w-12 text-orange-500" />
        <h3 className="mb-2 font-semibold text-gray-900 text-lg dark:text-gray-100">Karte konnte nicht geladen werden</h3>
        <p className="mb-4 text-center text-gray-600 text-sm dark:text-gray-400">
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
      {/* POI-Platzierungs-Modal */}
      {isModalOpen && selectedType && clickedCoordinates && lagekarteData?.data && (
        <PoiPlacementModal isOpen={isModalOpen} onClose={handleModalClose} poiType={selectedType} coordinates={clickedCoordinates} einsatzId={einsatzId} lagekarteId={lagekarteData.data.id} />
      )}

      {/* Karten-Container */}
      <div
        className={cn(
          'w-full',
          'h-[calc(100vh-120px)] md:h-[600px]', // Mobile: full viewport, Desktop: fixed height
          'overflow-hidden rounded-lg',
          'relative', // For loading overlay + POI-Control positioning
        )}
      >
        {/* POI-Platzierungs-Control (inside map container, positioned relative to map) */}
        <PoiPlacementControl onPoiTypeSelect={handlePoiTypeSelect} onCancel={deactivatePlacementMode} selectedType={selectedType} isPlacementActive={isPlacementActive} isModalOpen={isModalOpen} />

        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
            <Spinner type="ring" size="lg" />
          </div>
        )}
        <MapContainer
          center={defaultCenter}
          zoom={defaultZoom}
          className={cn('h-full w-full', isPlacementActive && 'placement-active')}
          scrollWheelZoom={true}
          whenReady={() => setIsLoading(false)}
          aria-label="Lagekarte"
        >
          <TileLayer url={tileUrl} attribution={attribution} />
          <TileErrorHandler onError={handleTileError} />
          <MapClickHandler isPlacementActive={isPlacementActive} selectedType={selectedType} onMapClick={handleMapClick} />
          <PoiLayer einsatzId={einsatzId} />
          <MapBoundsController einsatzId={einsatzId} />
        </MapContainer>
      </div>
    </>
  );
};
