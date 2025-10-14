import { Button } from '@/components/atoms/button.atom';
import { Spinner } from '@/components/atoms/spinner.atom';
import { useColorMode } from '@/hooks/use-color-mode';
import { cn } from '@/utils/cn';
import type React from 'react';
import { useState } from 'react';
import { PiWarning } from 'react-icons/pi';
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet';
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
export const LagekarteView: React.FC<LagekarteViewProps> = ({ einsatzId: _einsatzId }) => {
  const { resolvedColorMode } = useColorMode();
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

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
    <div
      className={cn(
        'w-full',
        'h-[calc(100vh-120px)] md:h-[600px]', // Mobile: full viewport, Desktop: fixed height
        'overflow-hidden rounded-lg',
        'relative', // For loading overlay
      )}
    >
      {isLoading && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/80 dark:bg-gray-900/80">
          <Spinner type="ring" size="lg" />
        </div>
      )}
      <MapContainer center={defaultCenter} zoom={defaultZoom} className="h-full w-full" scrollWheelZoom={true} whenReady={() => setIsLoading(false)} aria-label="Lagekarte">
        <TileLayer url={tileUrl} attribution={attribution} />
        <TileErrorHandler onError={handleTileError} />
      </MapContainer>
    </div>
  );
};
