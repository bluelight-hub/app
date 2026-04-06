/**
 * FahrzeugPoiLayer Komponente für Lagekarte (MapLibre GL JS)
 *
 * Rendert Einsatzfahrzeuge als Marker auf der Karte.
 */

import * as React from 'react';
import { Marker, Popup } from 'react-map-gl/maplibre';
import { useKraeftePois } from '@/features/kraefte/api/use-kraefte-pois';
import { getFahrzeugEmoji } from '@/features/lagekarte/utils/fahrzeug-icons';
import { logger } from '@/shared/lib/logger';
import { Spinner } from '@/shared/ui/atoms/spinner.atom';
import { PiXCircle } from 'react-icons/pi';

interface FahrzeugPoiLayerProps {
  einsatzId: string;
  onFahrzeugClick?: (fahrzeugId: string) => void;
}

const DEFAULT_STATUS_FARBE = '#6B7280';

/**
 * Fahrzeug-Icon als React-Komponente
 */
const FahrzeugIcon: React.FC<{ fahrzeugtypCode: string; statusFarbe: string | object | null }> = ({ fahrzeugtypCode, statusFarbe }) => {
  const emoji = getFahrzeugEmoji(fahrzeugtypCode);
  const farbe = typeof statusFarbe === 'string' ? statusFarbe : DEFAULT_STATUS_FARBE;

  return (
    <div
      style={{
        backgroundColor: farbe,
        width: 32,
        height: 32,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        fontSize: 16,
        cursor: 'pointer',
      }}
    >
      {emoji}
    </div>
  );
};

export const FahrzeugPoiLayer: React.FC<FahrzeugPoiLayerProps> = React.memo(({ einsatzId, onFahrzeugClick }) => {
  const { data: geojson, isLoading, error } = useKraeftePois(einsatzId);
  const [selectedFeatureId, setSelectedFeatureId] = React.useState<string | null>(null);

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

  if (error) {
    logger.error('Fahrzeug-POI-Fetch-Fehler:', error);
    return (
      <div className="absolute top-4 right-20 z-50 flex items-center gap-2 rounded-lg border-2 border-status-danger-border bg-status-danger-surface p-3 shadow-lg">
        <PiXCircle className="h-5 w-5 text-status-danger-text" />
        <p className="text-body-sm font-medium text-status-danger-text">Fahrzeug-POIs konnten nicht geladen werden</p>
      </div>
    );
  }

  if (!geojson || !geojson.features || geojson.features.length === 0) return null;

  const selectedFeature = geojson.features.find((f) => f.id === selectedFeatureId);

  return (
    <>
      {geojson.features.map((feature) => {
        // GeoJSON coordinates: [longitude, latitude]
        const [lng, lat] = feature.geometry.coordinates;
        const { name, statusLabel, statusFarbe, fahrzeugtypCode } = feature.properties;
        const ariaLabel = `Fahrzeug ${name}: ${statusLabel}`;

        return (
          <Marker key={feature.id} longitude={lng} latitude={lat} anchor="center" onClick={() => setSelectedFeatureId(String(feature.id))}>
            <div title={ariaLabel} aria-label={ariaLabel}>
              <FahrzeugIcon fahrzeugtypCode={fahrzeugtypCode} statusFarbe={statusFarbe} />
            </div>
          </Marker>
        );
      })}

      {/* Popup für selektiertes Fahrzeug */}
      {selectedFeature &&
        (() => {
          const [lng, lat] = selectedFeature.geometry.coordinates;
          const { name, statusLabel, statusFarbe, staerke, positionTimestamp } = selectedFeature.properties;
          const staerkeDisplay = staerke && typeof staerke === 'object' ? JSON.stringify(staerke) : String(staerke ?? '-');

          return (
            <Popup longitude={lng} latitude={lat} onClose={() => setSelectedFeatureId(null)} closeOnClick={false} anchor="bottom" offset={16}>
              <div className="space-y-2 p-2">
                <h3 className="text-lg font-semibold text-text-primary">{name}</h3>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: typeof statusFarbe === 'string' ? statusFarbe : '#6B7280' }} />
                  <span className="text-body-sm text-text-secondary">{statusLabel}</span>
                </div>
                <p className="text-body-sm text-text-secondary">
                  <span className="font-medium">Stärke:</span> {staerkeDisplay}
                </p>
                {positionTimestamp && <p className="text-body-xs text-text-muted">Position: {new Date(positionTimestamp).toLocaleTimeString('de-DE')}</p>}
                {onFahrzeugClick && (
                  <button type="button" onClick={() => onFahrzeugClick(String(selectedFeature.id))} className="mt-2 text-body-sm text-action-primary hover:underline">
                    Zum Fahrzeug
                  </button>
                )}
              </div>
            </Popup>
          );
        })()}
    </>
  );
});

FahrzeugPoiLayer.displayName = 'FahrzeugPoiLayer';
