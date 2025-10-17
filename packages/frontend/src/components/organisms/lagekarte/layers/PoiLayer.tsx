import { usePois } from '@/api/hooks/useLagekarteApi';
import { Spinner } from '@/components/atoms/spinner.atom';
import { getPoiIcon } from '@/utils/poi-icons';
import React, { useMemo } from 'react';
import { PiWarning, PiXCircle } from 'react-icons/pi';
import { Marker, Popup } from 'react-leaflet';

interface PoiLayerProps {
  einsatzId: string;
}

/**
 * PoiLayer-Komponente für Lagekarte
 *
 * Rendert alle POIs (Points of Interest) als Marker auf der Karte.
 * - Fetcht POIs via TanStack Query Hook
 * - Verwendet typenspezifische Icons aus react-icons
 * - Zeigt Popup mit POI-Details bei Klick
 * - Behandelt Loading- und Error-States
 * - Performance-optimiert mit React.memo() und useMemo()
 * - Barrierefrei mit ARIA-Labels für Screen Reader
 *
 * @param einsatzId - ID des aktuellen Einsatzes
 *
 * @remarks
 * Performance-Optimierungen:
 * - React.memo() verhindert unnötige Re-Renders
 * - useMemo() cached POI-Validierung und Icon-Berechnung
 * - Story 48.6 wird Marker-Clustering für >3 POIs in Nähe implementieren
 *
 * Performance-Ziel (IV3):
 * - <2 Sekunden Ladezeit bei 20 POIs (auf 4G Verbindung)
 * - Messung: Chrome DevTools Performance Tab → Measure First Contentful Paint
 */
export const PoiLayer: React.FC<PoiLayerProps> = React.memo(({ einsatzId }) => {
  const { data: pois, isLoading, error } = usePois(einsatzId);

  // Berechne gültige und ungültige POIs (Performance-optimiert mit useMemo)
  // WICHTIG: Muss VOR allen early returns stehen (React Hooks Rules)
  const { validPois, skippedCount } = useMemo(() => {
    if (!pois || pois.length === 0) {
      return { validPois: [], skippedCount: 0 };
    }

    const valid: typeof pois = [];
    let skipped = 0;

    for (const poi of pois) {
      if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number' || Number.isNaN(poi.latitude) || Number.isNaN(poi.longitude)) {
        console.warn(`POI ${poi.id} has invalid coordinates:`, {
          latitude: poi.latitude,
          longitude: poi.longitude,
        });
        skipped++;
      } else {
        valid.push(poi);
      }
    }

    return { validPois: valid, skippedCount: skipped };
  }, [pois]);

  // Loading-State: Spinner in oberer rechter Ecke
  if (isLoading) {
    return (
      <div className="absolute top-4 right-4 z-50 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800">
        <Spinner size="sm" type="ring" />
      </div>
    );
  }

  // Error-State: Error-Badge in Map-Ecke
  if (error) {
    console.error('POI-Fetch-Fehler:', error);
    return (
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 rounded-lg border-2 border-red-500 bg-red-50 p-3 shadow-lg dark:border-red-400 dark:bg-red-900/50">
        <PiXCircle className="h-5 w-5 text-red-500 dark:text-red-400" />
        <p className="font-medium text-red-700 text-sm dark:text-red-300">POIs konnten nicht geladen werden</p>
      </div>
    );
  }

  // Keine POIs vorhanden
  if (!pois || pois.length === 0) {
    return null;
  }

  return (
    <>
      {/* Warning-Badge für übersprungene POIs */}
      {skippedCount > 0 && (
        <div className="absolute right-4 bottom-4 z-50 flex items-center gap-2 rounded-lg border-2 border-orange-500 bg-orange-50 p-3 shadow-lg dark:border-orange-400 dark:bg-orange-900/50">
          <PiWarning className="h-5 w-5 text-orange-500 dark:text-orange-400" />
          <p className="font-medium text-orange-700 text-sm dark:text-orange-300">
            {skippedCount} POI{skippedCount > 1 ? 's' : ''} konnten nicht angezeigt werden (ungültige Koordinaten)
          </p>
        </div>
      )}

      {/* Render gültige POI-Marker */}
      {validPois.map((poi) => {
        const icon = getPoiIcon(poi.type);
        // ACCESSIBILITY: Create descriptive ARIA label for screen readers
        const ariaLabel = `${poi.type}: ${poi.name}${poi.adresse ? ` bei ${poi.adresse}` : ''}`;

        return (
          <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={icon} title={ariaLabel} alt={ariaLabel} aria-label={ariaLabel}>
            <Popup className="poi-popup">
              <div className="rounded-lg bg-white p-4 shadow-lg dark:bg-gray-800 dark:text-white">
                {/* POI-Name */}
                <h3 className="mb-2 font-semibold text-lg">{poi.name}</h3>

                {/* POI-Type */}
                <p className="mb-1 text-gray-600 text-sm dark:text-gray-400">{poi.type}</p>

                {/* Adresse (optional) */}
                {poi.adresse && <p className="text-gray-700 text-sm dark:text-gray-300">{poi.adresse}</p>}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
});
