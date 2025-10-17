import type React from 'react';
import { Marker, Popup } from 'react-leaflet';
import { usePois } from '@/api/hooks/useLagekarteApi';
import { getPoiIcon } from '@/utils/poi-icons';
import { Spinner } from '@/components/atoms/spinner.atom';

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
 *
 * @param einsatzId - ID des aktuellen Einsatzes
 */
export const PoiLayer: React.FC<PoiLayerProps> = ({ einsatzId }) => {
  const { data: pois, isLoading, error } = usePois(einsatzId);

  // Loading-State: Spinner in oberer rechter Ecke
  if (isLoading) {
    return (
      <div className="absolute top-4 right-4 z-50 rounded-lg bg-white p-3 shadow-lg dark:bg-gray-800">
        <Spinner size="sm" type="ring" />
      </div>
    );
  }

  // Error-State: Wird in Task 9 implementiert
  if (error) {
    // TODO: Task 9 - Error-Handling implementieren
    return null;
  }

  // Keine POIs vorhanden
  if (!pois || pois.length === 0) {
    return null;
  }

  return (
    <>
      {pois.map((poi) => {
        // Validierung: Überspringe POIs mit ungültigen Koordinaten
        if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number' || Number.isNaN(poi.latitude) || Number.isNaN(poi.longitude)) {
          console.warn(`POI ${poi.id} has invalid coordinates:`, {
            latitude: poi.latitude,
            longitude: poi.longitude,
          });
          return null;
        }

        const icon = getPoiIcon(poi.type);

        return (
          <Marker key={poi.id} position={[poi.latitude, poi.longitude]} icon={icon}>
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
};
