import { useRef, useCallback, useEffect } from 'react';
import { Debouncer } from '@tanstack/pacer';
import { useSaveLagekarteState } from '@/features/lagekarte/api';
import type * as GeoJSON from 'geojson';

/**
 * Hook für debounced Auto-Save der Lagekarte-State
 *
 * **Debouncing Strategy:**
 * - Wartet 2 Sekunden Inaktivität vor dem Speichern
 * - Verhindert excessive API-Calls während aktiver Bearbeitung
 * - Nutzt TanStack Pacer Debouncer für performantes Debouncing
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
   * Debouncer Instance Ref
   * Wartet 2 Sekunden bevor Mutation getriggert wird
   */
  const debouncerRef = useRef<Debouncer<[GeoJSON.FeatureCollection], void> | null>(null);

  // Lazy initialization um saveMutation.mutate korrekt zu capturen
  if (!debouncerRef.current) {
    debouncerRef.current = new Debouncer(
      (state: GeoJSON.FeatureCollection) => {
        saveMutation.mutate(state);
      },
      { wait: 2000 }, // 2 seconds debounce (as per AC3)
    );
  }

  /**
   * Cleanup: Cancel pending debounced save on unmount (Memory Leak Fix)
   * Verhindert dass nach Unmount noch gespeichert wird
   */
  useEffect(() => {
    const debouncer = debouncerRef.current;
    return () => {
      debouncer?.cancel();
    };
  }, []);

  /**
   * Stable callback that uses the debouncer's maybeExecute method
   */
  const triggerAutoSave = useCallback((state: GeoJSON.FeatureCollection) => {
    debouncerRef.current?.maybeExecute(state);
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
