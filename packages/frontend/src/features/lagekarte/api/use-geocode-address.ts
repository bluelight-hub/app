import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { api } from '@/shared/api/client';

/**
 * TanStack Mutation Hook zum Geocoding einer Adresse
 *
 * @param einsatzId - Die ID des Einsatzes (für API-Kontext)
 * @returns Mutation result mit mutate-Funktion, Loading- und Error-State
 *
 * @remarks
 * - Konvertiert Textadresse zu geografischen Koordinaten via Nominatim API
 * - Rate-Limited (Backend: 10 req/min, Service: 1 req/s)
 * - Gibt `null` zurück bei Fehler oder wenn keine Ergebnisse gefunden
 * - Sollte mit Debouncing verwendet werden (1s delay empfohlen)
 *
 * @example
 * ```tsx
 * const geocodeMutation = useGeocodeAddress('einsatz-123');
 *
 * geocodeMutation.mutate('Hauptstraße 1, 10115 Berlin', {
 *   onSuccess: (coords) => {
 *     if (coords) {
 *       setLatitude(coords.lat);
 *       setLongitude(coords.lon);
 *     } else {
 *       showToast('Adresse nicht gefunden');
 *     }
 *   },
 * });
 * ```
 */
export const useGeocodeAddress = (einsatzId: string): UseMutationResult<{ lat: number; lon: number } | null, Error, string> => {
  return useMutation({
    mutationFn: async (address: string) => {
      const response = await api.geocoding().geocodingControllerGeocodeAddressVAlpha({
        einsatzId,
        geocodeAddressDto: { address },
      });

      // Response hat Struktur: { data: { lat, lon } | null }
      return response.data as { lat: number; lon: number } | null;
    },
  });
};
