/**
 * Hook für Multi-Select und Feature-Gruppierung
 *
 * MapboxDraw unterstützt Multi-Select nativ (Shift+Klick / Shift+Drag).
 * Dieser Hook erweitert das um Gruppen-Logik: Erstellen, Auflösen,
 * Auswahl nach Gruppe.
 */

import { useCallback } from 'react';
import type MapboxDraw from '@mapbox/mapbox-gl-draw';
import { useStore } from '@tanstack/react-store';
import { addFeatureGroup, drawStore, removeFeatureGroup, setSelectedFeatures, type FeatureGroup } from '../stores/draw.store';

interface UseMultiSelectOptions {
  /** Referenz auf die MapboxDraw-Instanz */
  drawRef: React.RefObject<MapboxDraw | null>;
  /** Auto-Save auslösen */
  scheduleAutoSave: () => void;
}

interface UseMultiSelectReturn {
  /** Alle Feature-Gruppen */
  groups: FeatureGroup[];
  /** Gruppen der aktuell selektierten Features */
  groupsForSelection: FeatureGroup[];
  /** Neue Gruppe aus aktueller Selektion erstellen */
  createGroup: (name: string) => void;
  /** Gruppe auflösen */
  dissolveGroup: (groupId: string) => void;
  /** Alle Features einer Gruppe selektieren */
  selectByGroup: (groupId: string) => void;
  /** Anzahl selektierter Features */
  selectionCount: number;
}

export function useMultiSelect({ drawRef, scheduleAutoSave }: UseMultiSelectOptions): UseMultiSelectReturn {
  const groups = useStore(drawStore, (s) => s.featureGroups) ?? [];
  const selectedFeatureIds = useStore(drawStore, (s) => s.selectedFeatureIds) ?? [];

  const groupsForSelection = groups.filter((g) => g.featureIds.some((id) => selectedFeatureIds.includes(id)));

  const createGroup = useCallback(
    (name: string) => {
      if (selectedFeatureIds.length < 2) return;
      const draw = drawRef.current;
      if (!draw) return;

      const groupId = crypto.randomUUID();

      // groupId auf alle selektierten Features setzen
      for (const featureId of selectedFeatureIds) {
        draw.setFeatureProperty(featureId, 'groupId', groupId);
      }

      addFeatureGroup({
        id: groupId,
        name,
        featureIds: [...selectedFeatureIds],
      });

      scheduleAutoSave();
    },
    [selectedFeatureIds, drawRef, scheduleAutoSave],
  );

  const dissolveGroup = useCallback(
    (groupId: string) => {
      const draw = drawRef.current;
      if (!draw) return;

      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      // groupId von allen Features entfernen (null statt undefined, da JSON.stringify undefined → null konvertiert)
      for (const featureId of group.featureIds) {
        draw.setFeatureProperty(featureId, 'groupId', null);
      }

      removeFeatureGroup(groupId);
      scheduleAutoSave();
    },
    [groups, drawRef, scheduleAutoSave],
  );

  const selectByGroup = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (!group) return;

      const draw = drawRef.current;
      if (!draw) return;

      // Existierende Feature-IDs prüfen (manche könnten gelöscht worden sein)
      const validIds = group.featureIds.filter((id) => draw.get(id) != null);
      setSelectedFeatures(validIds);

      // MapboxDraw-Selektion synchronisieren
      try {
        draw.changeMode('simple_select', { featureIds: validIds });
      } catch {
        // Kann fehlschlagen wenn Draw nicht bereit ist
      }
    },
    [groups, drawRef],
  );

  return {
    groups,
    groupsForSelection,
    createGroup,
    dissolveGroup,
    selectByGroup,
    selectionCount: selectedFeatureIds.length,
  };
}
