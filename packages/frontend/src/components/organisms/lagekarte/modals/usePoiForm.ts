import { useCreatePoi, useGeocodeAddress } from '@/api/hooks/useLagekarteApi';
import type { PoiType } from '@/utils/poi-icons';
import { getApiErrorMessage } from '@/utils/apiErrorHandler';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { toast } from 'sonner';
import { z } from 'zod';
import { asyncDebounce } from '@tanstack/pacer';
import { useCallback, useMemo } from 'react';

/**
 * Zod-Validierungsschema für POI-Erstellung
 *
 * @remarks
 * - name: Mindestens 3 Zeichen (required)
 * - adresse: Optional, für Geocoding
 * - latitude/longitude: Erforderlich als Fallback wenn kein Geocoding
 * - type: POI-Typ aus Enum
 * - icon: Optional, wird vom Backend basierend auf type gesetzt
 *
 * CUX-007: Koordinaten-Validierung
 * - latitude: -90 bis 90 (geografische Grenzen)
 * - longitude: -180 bis 180 (geografische Grenzen)
 */
const poiFormSchema = z.object({
  name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
  adresse: z.string().optional(),
  latitude: z.number({ required_error: 'Breitengrad ist erforderlich' }).min(-90, 'Breitengrad muss zwischen -90 und 90 liegen').max(90, 'Breitengrad muss zwischen -90 und 90 liegen'),
  longitude: z.number({ required_error: 'Längengrad ist erforderlich' }).min(-180, 'Längengrad muss zwischen -180 und 180 liegen').max(180, 'Längengrad muss zwischen -180 und 180 liegen'),
  type: z.string(), // PoiType as string (validated by backend)
  icon: z.string().optional(),
});

/**
 * Form Values Type (infered from Zod schema)
 */
export type PoiFormValues = z.infer<typeof poiFormSchema>;

/**
 * usePoiForm Hook Props
 */
export interface UsePoiFormProps {
  /**
   * EinsatzId für POI-Erstellung (für TanStack Query Invalidation)
   */
  einsatzId: string;

  /**
   * LagekarteId für POI-Erstellung (wird an Backend gesendet)
   */
  lagekarteId: string;

  /**
   * Initialer POI-Typ (vorausgewählt aus Toolbar)
   */
  initialType: PoiType;

  /**
   * Initiale Koordinaten (von Karten-Klick)
   */
  initialCoordinates: {
    lat: number;
    lon: number;
  };

  /**
   * Callback nach erfolgreicher POI-Erstellung
   */
  onSuccess?: () => void;

  /**
   * Callback bei Fehler
   */
  onError?: (error: Error) => void;
}

/**
 * Hook zum Verwalten des POI-Erstellungs-Formulars
 *
 * Verwendet TanStack Form mit Zod-Validation für typsichere Formular-Verwaltung.
 *
 * @param props - Hook configuration
 * @returns TanStack Form instance
 *
 * @remarks
 * Features:
 * - Zod-Validation für alle Felder
 * - TanStack Query Mutation für POI-Erstellung
 * - Geocoding-Integration mit Debouncing (1s delay)
 * - Automatische Koordinaten-Updates bei Adressänderung
 * - Automatische Query-Invalidation nach Erfolg
 *
 * @example
 * ```tsx
 * const form = usePoiForm({
 *   einsatzId: 'einsatz-123',
 *   lagekarteId: 'lagekarte-456',
 *   initialType: 'FAHRZEUG',
 *   initialCoordinates: { lat: 51.1, lon: 10.1 },
 *   onSuccess: () => closeModal(),
 * });
 *
 * // In Form-Component:
 * <form.Field name="name">
 *   {(field) => <Input {...field} />}
 * </form.Field>
 * ```
 */
export const usePoiForm = ({ einsatzId, lagekarteId, initialType, initialCoordinates, onSuccess, onError }: UsePoiFormProps) => {
  const createPoiMutation = useCreatePoi(einsatzId);
  const geocodeMutation = useGeocodeAddress(einsatzId);

  const form = useForm({
    defaultValues: {
      name: '',
      adresse: '',
      latitude: initialCoordinates.lat,
      longitude: initialCoordinates.lon,
      type: initialType as string,
      icon: undefined,
    },
    onSubmit: async ({ value }) => {
      try {
        // Zod-Validation
        const validated = poiFormSchema.parse(value);

        // API-Call via TanStack Query Mutation
        await createPoiMutation.mutateAsync({
          lagekarteId,
          type: validated.type, // Backend validates POI type via DTO
          name: validated.name,
          adresse: validated.adresse,
          latitude: validated.latitude,
          longitude: validated.longitude,
          icon: validated.icon,
        });

        // Toast-Notification für Erfolg
        toast.success('POI erstellt', {
          description: `"${validated.name}" wurde erfolgreich zur Karte hinzugefügt.`,
        });

        // Success callback
        onSuccess?.();
      } catch (error) {
        // Error handling
        console.error('POI-Erstellung fehlgeschlagen:', error);

        // Toast-Notification für Fehler
        const message = await getApiErrorMessage(error, 'Der POI konnte nicht erstellt werden.');
        toast.error('Fehler beim Erstellen', {
          description: message,
        });

        onError?.(error instanceof Error ? error : new Error('Unbekannter Fehler'));
      }
    },
    validatorAdapter: zodValidator(),
  });

  /**
   * Geocoding Handler
   *
   * @remarks
   * - Nur geocoden wenn Adresse mind. 5 Zeichen hat
   * - Bei Erfolg: Koordinaten werden automatisch aktualisiert
   * - Bei Fehler: Koordinaten bleiben unverändert (User kann manuell editieren)
   */
  const handleGeocode = useCallback(
    async (address: string) => {
      // Nur geocoden wenn Adresse mind. 5 Zeichen hat
      if (!address || address.trim().length < 5) {
        return;
      }

      geocodeMutation.mutate(address.trim(), {
        onSuccess: (coords) => {
          if (coords) {
            // Update Koordinaten-Felder automatisch
            form.setFieldValue('latitude', coords.lat);
            form.setFieldValue('longitude', coords.lon);
          }
          // Bei null: Adresse nicht gefunden, Koordinaten bleiben unverändert
        },
        onError: (error) => {
          console.warn('Geocoding fehlgeschlagen:', error);
          // Koordinaten bleiben bei Fehler unverändert
        },
      });
    },
    [geocodeMutation, form],
  );

  /**
   * Debounced Geocoding Handler
   *
   * @remarks
   * - Wartet 1s nach letzter Eingabe bevor Geocoding-API aufgerufen wird
   * - Rate-Limit Compliance: Backend erlaubt 10 req/min, Service 1 req/s
   * - Nutzt TanStack Pacer asyncDebounce für Debouncing
   */
  const debouncedGeocode = useMemo(
    () => asyncDebounce(handleGeocode, { interval: 1000 }), // 1s Debounce Delay
    [handleGeocode],
  );

  return {
    form,
    isLoading: createPoiMutation.isPending,
    isError: createPoiMutation.isError,
    error: createPoiMutation.error,
    isGeocoding: geocodeMutation.isPending,
    debouncedGeocode,
  };
};
