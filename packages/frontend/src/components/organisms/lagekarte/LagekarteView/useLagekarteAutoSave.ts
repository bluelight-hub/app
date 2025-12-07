import { useRef, useCallback } from 'react';
import { debounce } from '@tanstack/pacer';
import { useSaveLagekarteState } from '@/features/lagekarte/api';
import type * as GeoJSON from 'geojson';

/**
 * Hook für debounced Auto-Save der Lagekarte-State
 *
 * **Debouncing Strategy:**
 * - Wartet 2 Sekunden Inaktivität vor dem Speichern
 * - Verhindert excessive API-Calls während aktiver Bearbeitung
 * - Nutzt TanStack Pacer für performantes Debouncing
 *
 * **Workflow:**
 * 1. User macht Änderung (POI-Platzierung, Zeichnung)
 * 2. 2s Timer startet
 * 3. Bei weiteren Änderungen: Timer resettet
 * 4. Nach 2s Inaktivität: State wird gespeichert
 *
 * @param einsatzId - ID des Einsatzes (für Mutation)
 *
 * @example
 * ```tsx
 * const { triggerAutoSave } = useLagekarteAutoSave(einsatzId);
 *
 * // Bei Änderung triggern
 * const handleShapesChange = (shapes: GeoJSON.FeatureCollection) => {
 *   triggerAutoSave(shapes);
 * };
 * ```
 */
export const useLagekarteAutoSave = (einsatzId: string) => {
  const saveMutation = useSaveLagekarteState(einsatzId);

  /**
   * Debounced Save Callback
   * Wartet 2 Sekunden bevor Mutation getriggert wird
   */
  const debouncedSaveRef = useRef(
    debounce(
      (state: GeoJSON.FeatureCollection) => {
        saveMutation.mutate(state);
      },
      { wait: 2000 }, // 2 seconds debounce (as per AC3)
    ),
  );

  /**
   * Stable callback that uses the debounced function
   */
  const triggerAutoSave = useCallback((state: GeoJSON.FeatureCollection) => {
    debouncedSaveRef.current(state);
  }, []);

  return {
    /**
     * Trigger Auto-Save mit Debouncing
     * @param state - GeoJSON FeatureCollection mit Zeichnungen
     */
    triggerAutoSave,

    /**
     * Loading-State der Save-Mutation
     */
    isSaving: saveMutation.isPending,

    /**
     * Error-State der Save-Mutation
     */
    error: saveMutation.error,
  };
};
