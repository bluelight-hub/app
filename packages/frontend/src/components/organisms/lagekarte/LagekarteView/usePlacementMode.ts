import type { PoiType } from '@/utils/poi-icons';
import { useCallback, useState } from 'react';

/**
 * Placement-Mode State
 */
export interface PlacementModeState {
  /**
   * Aktuell ausgewählter POI-Typ für Platzierung
   */
  selectedType: PoiType | null;

  /**
   * Ob Platzierungs-Modus aktiv ist
   * (User hat Typ ausgewählt und kann auf Karte klicken)
   */
  isPlacementActive: boolean;
}

/**
 * Placement-Mode Hook Return Type
 */
export interface UsePlacementModeReturn extends PlacementModeState {
  /**
   * Aktiviert Platzierungs-Modus für gegebenen POI-Typ
   * @param type - POI-Typ der platziert werden soll
   */
  activatePlacementMode: (type: PoiType) => void;

  /**
   * Deaktiviert Platzierungs-Modus (zurück zu normalem Karten-Modus)
   */
  deactivatePlacementMode: () => void;
}

/**
 * Hook zum Verwalten des POI-Platzierungs-Modus
 *
 * Verwaltet den State für POI-Platzierung auf der Karte:
 * - Welcher POI-Typ ist ausgewählt
 * - Ob Platzierungs-Modus aktiv ist
 * - Cursor-Wechsel zu Crosshair (über CSS-Klasse auf Map)
 *
 * @returns Placement-Mode State und Control-Funktionen
 *
 * @remarks
 * - Cursor-Wechsel erfolgt über CSS-Klasse 'placement-active' auf MapContainer
 * - Leaflet unterstützt keine dynamische Cursor-Änderung via API, daher CSS
 * - Platzierungs-Modus wird automatisch deaktiviert nach POI-Erstellung
 *
 * @example
 * ```tsx
 * const { selectedType, isPlacementActive, activatePlacementMode, deactivatePlacementMode } = usePlacementMode();
 *
 * // User wählt POI-Typ aus Toolbar
 * activatePlacementMode('FAHRZEUG');
 *
 * // Nach POI-Erstellung
 * deactivatePlacementMode();
 * ```
 */
export const usePlacementMode = (): UsePlacementModeReturn => {
  const [state, setState] = useState<PlacementModeState>({
    selectedType: null,
    isPlacementActive: false,
  });

  /**
   * Aktiviert Platzierungs-Modus
   */
  const activatePlacementMode = useCallback((type: PoiType) => {
    setState({
      selectedType: type,
      isPlacementActive: true,
    });
  }, []);

  /**
   * Deaktiviert Platzierungs-Modus
   */
  const deactivatePlacementMode = useCallback(() => {
    setState({
      selectedType: null,
      isPlacementActive: false,
    });
  }, []);

  return {
    ...state,
    activatePlacementMode,
    deactivatePlacementMode,
  };
};
