import { useCreatePoi } from '@/api/hooks/useLagekarteApi';
import type { PoiType } from '@/utils/poi-icons';
import { useForm } from '@tanstack/react-form';
import { zodValidator } from '@tanstack/zod-form-adapter';
import { z } from 'zod';

/**
 * Zod-Validierungsschema für POI-Erstellung
 *
 * @remarks
 * - name: Mindestens 3 Zeichen (required)
 * - adresse: Optional, für Geocoding
 * - latitude/longitude: Erforderlich als Fallback wenn kein Geocoding
 * - type: POI-Typ aus Enum
 * - icon: Optional, wird vom Backend basierend auf type gesetzt
 */
const poiFormSchema = z.object({
  name: z.string().min(3, 'Name muss mindestens 3 Zeichen lang sein'),
  adresse: z.string().optional(),
  latitude: z.number({ required_error: 'Breitengrad ist erforderlich' }),
  longitude: z.number({ required_error: 'Längengrad ist erforderlich' }),
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
 * - Geocoding-Integration (TODO: Story 48.2 Geocoding-API)
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

        // Success callback
        onSuccess?.();
      } catch (error) {
        // Error handling
        console.error('POI-Erstellung fehlgeschlagen:', error);
        onError?.(error instanceof Error ? error : new Error('Unbekannter Fehler'));
      }
    },
    validatorAdapter: zodValidator(),
  });

  return {
    form,
    isLoading: createPoiMutation.isPending,
    isError: createPoiMutation.isError,
    error: createPoiMutation.error,
  };
};
