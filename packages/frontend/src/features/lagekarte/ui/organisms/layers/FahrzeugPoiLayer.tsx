/**
 * FahrzeugPoiLayer Komponente fuer Lagekarte
 *
 * **Story 8.1 - Fahrzeuge als POIs auf Lagekarte:**
 * Rendert Einsatzfahrzeuge als GeoJSON POIs auf der Karte.
 *
 * **Features:**
 * - GeoJSON FeatureCollection Rendering (AC1)
 * - Farbcodierte Icons via statusFarbe (AC2)
 * - Popup mit Funkrufname, Status, Staerke, Timestamp (AC3)
 * - Auto-Refresh alle 30s (AC4)
 *
 * @remarks
 * - Koordinaten: GeoJSON [lng, lat] -> Leaflet [lat, lng] (umgekehrt!)
 * - Performance: React.memo() verhindert unnoetige Re-Renders
 */

import * as React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { useKraeftePois } from '@/features/kraefte/api/use-kraefte-pois';
import { createFahrzeugIcon } from '@/features/lagekarte/utils/fahrzeug-icons';
import { logger } from '@/shared/lib/logger';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { PiXCircle } from 'react-icons/pi';

/**
 * Props fuer FahrzeugPoiLayer Komponente
 */
interface FahrzeugPoiLayerProps {
  /** Einsatz-ID fuer die Fahrzeug-POIs */
  einsatzId: string;
  /** Callback wenn ein Fahrzeug angeklickt wird (optional) */
  onFahrzeugClick?: (fahrzeugId: string) => void;
}

/**
 * FahrzeugPoiLayer Komponente
 *
 * Rendert Einsatzfahrzeuge als Marker auf der Lagekarte.
 *
 * @param einsatzId - Die Einsatz-ID
 * @param onFahrzeugClick - Callback fuer Fahrzeug-Klick (optional)
 *
 * @example
 * ```tsx
 * <MapContainer>
 *   <FahrzeugPoiLayer
 *     einsatzId="123"
 *     onFahrzeugClick={(id) => navigate(`/fahrzeuge/${id}`)}
 *   />
 * </MapContainer>
 * ```
 */
export const FahrzeugPoiLayer: React.FC<FahrzeugPoiLayerProps> = React.memo(({ einsatzId, onFahrzeugClick }) => {
  const { data: geojson, isLoading, error } = useKraeftePois(einsatzId);

  // Loading-State: Spinner in oberer rechter Ecke
  if (isLoading) {
    return (
      <div className="absolute top-4 right-20 z-50 rounded-lg bg-surface-panel p-3 shadow-lg">
        <div className="flex items-center gap-2">
          <Spinner size="sm" type="ring" />
          <span className="text-body-sm text-text-secondary">Fahrzeuge laden...</span>
        </div>
      </div>
    );
  }

  // Error-State: Error-Badge in Map-Ecke
  if (error) {
    logger.error('Fahrzeug-POI-Fetch-Fehler:', error);
    return (
      <div className="absolute top-4 right-20 z-50 flex items-center gap-2 rounded-lg border-2 border-status-danger-border bg-status-danger-surface p-3 shadow-lg">
        <PiXCircle className="h-5 w-5 text-status-danger-text" />
        <p className="font-medium text-body-sm text-status-danger-text">Fahrzeug-POIs konnten nicht geladen werden</p>
      </div>
    );
  }

  // Keine Daten oder leere Features
  if (!geojson || !geojson.features || geojson.features.length === 0) {
    return null;
  }

  return (
    <>
      {geojson.features.map((feature) => {
        // GeoJSON coordinates: [longitude, latitude]
        // Leaflet position: [latitude, longitude] - UMGEKEHRT!
        const [lng, lat] = feature.geometry.coordinates;
        const { name, statusLabel, statusFarbe, staerke, positionTimestamp, fahrzeugtypCode } = feature.properties;

        // Icon mit Status-Farbe erstellen
        const icon = createFahrzeugIcon(fahrzeugtypCode, statusFarbe);

        // ARIA-Label fuer Accessibility
        const ariaLabel = `Fahrzeug ${name}: ${statusLabel}`;

        // Staerke als String formatieren (kann object oder null sein)
        const staerkeDisplay = staerke && typeof staerke === 'object' ? JSON.stringify(staerke) : String(staerke ?? '-');

        return (
          <Marker key={feature.id} position={[lat, lng]} icon={icon} title={ariaLabel} alt={ariaLabel} aria-label={ariaLabel}>
            <Popup className="fahrzeug-popup">
              <div className="space-y-2 p-2">
                {/* Fahrzeug-Name (Funkrufname) */}
                <h3 className="font-semibold text-text-primary text-lg">{name}</h3>

                {/* Status mit Farbindikator */}
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: typeof statusFarbe === 'string' ? statusFarbe : '#6B7280' }} />
                  <span className="text-body-sm text-text-secondary">{statusLabel}</span>
                </div>

                {/* Taktische Staerke */}
                <p className="text-body-sm text-text-secondary">
                  <span className="font-medium">Staerke:</span> {staerkeDisplay}
                </p>

                {/* Position Timestamp (AC3) */}
                {positionTimestamp && <p className="text-body-xs text-text-muted">Position: {new Date(positionTimestamp).toLocaleTimeString('de-DE')}</p>}

                {/* Link zum Fahrzeug (optional) */}
                {onFahrzeugClick && (
                  <button type="button" onClick={() => onFahrzeugClick(feature.id)} className="mt-2 text-body-sm text-action-primary hover:underline">
                    Zum Fahrzeug
                  </button>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});

FahrzeugPoiLayer.displayName = 'FahrzeugPoiLayer';
