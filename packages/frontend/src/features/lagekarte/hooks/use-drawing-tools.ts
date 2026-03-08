import { useEffect, useCallback } from 'react';
import type * as L from 'leaflet';
import type { DrawingTool } from '@/features/lagekarte/ui';
import { DEFAULT_SHAPE_STYLE } from '@/features/lagekarte/utils';
import { setActiveDrawingTool, setPmInitialized, selectShape } from '@/features/lagekarte';
import { lagekarteStore } from '@/features/lagekarte';

/**
 * Konsolidierter Hook für Drawing Tools und Leaflet.PM Controls
 *
 * Ersetzt folgende alte Hooks:
 * - useLeafletPMControls → initializePm()
 * - useDrawingToolSelection → activateTool()
 * - useToolbarPositioning → (separater Hook, da UI-spezifisch)
 *
 * @param map - Leaflet Map Instanz
 * @returns Objekt mit Drawing Tool Funktionen
 *
 * @example
 * ```tsx
 * const drawingTools = useDrawingTools(map);
 *
 * // PM initialisieren
 * useEffect(() => {
 *   drawingTools.initializePm();
 * }, []);
 *
 * // Tool aktivieren
 * drawingTools.activateTool('polygon');
 * ```
 */
export const useDrawingTools = (map: L.Map) => {
  /**
   * Initialisiert Leaflet.PM Controls
   *
   * Konsolidiert Logik aus useLeafletPMControls
   */
  const initializePm = useCallback(() => {
    const state = lagekarteStore.state;

    // Defensive check: Ensure PM is available
    if (!map.pm?.Toolbar) {
      console.warn('[useDrawingTools] Leaflet.PM not available on map');
      return;
    }

    // Prevent double initialization
    if (state.isPmInitialized) {
      return;
    }

    // Add Leaflet.PM Controls to map
    map.pm.addControls({
      position: 'topright',
      // Disable all default buttons (we use custom DrawingToolbar)
      drawPolygon: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawMarker: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      removalMode: false,
    });

    // Hide default PM controls (we use custom DrawingToolbar)
    if (map.pm.Toolbar) {
      map.pm.Toolbar.setButtonDisabled('drawPolygon', true);
      map.pm.Toolbar.setButtonDisabled('drawPolyline', true);
      map.pm.Toolbar.setButtonDisabled('drawRectangle', true);
    }

    setPmInitialized(true);
  }, [map]);

  /**
   * Deaktiviert alle PM Drawing Modes
   */
  const disableAllPmModes = useCallback(() => {
    if (!map.pm?.Toolbar) return;

    const safeDisable = (action: () => void, label: string) => {
      try {
        action();
      } catch (error) {
        console.warn(`[useDrawingTools] Failed to disable ${label}`, error);
      }
    };

    safeDisable(() => map.pm.disableDraw(), 'draw mode');

    if (typeof map.pm.globalEditModeEnabled === 'function' && map.pm.globalEditModeEnabled()) {
      safeDisable(() => map.pm.disableGlobalEditMode(), 'global edit mode');
    }

    if (typeof map.pm.globalRemovalModeEnabled === 'function' && map.pm.globalRemovalModeEnabled()) {
      safeDisable(() => map.pm.disableGlobalRemovalMode(), 'global removal mode');
    }
  }, [map]);

  /**
   * Aktiviert ein Drawing Tool
   *
   * Konsolidiert Logik aus useDrawingToolSelection
   */
  const activateTool = useCallback(
    (tool: DrawingTool | null) => {
      // Defensive check: Ensure PM is available
      if (!map.pm?.Toolbar) {
        console.warn('[useDrawingTools] Leaflet.PM not available, cannot activate tool:', tool);
        return;
      }

      // Disable previous mode
      disableAllPmModes();

      if (!tool) {
        // Deselect shape when tool is cleared
        selectShape(null);
        setActiveDrawingTool(null);
        return;
      }

      // Activate drawing mode based on selected tool
      switch (tool) {
        case 'select':
          // Click-to-Select bleibt aktiv (handled by useShapeActions)
          break;
        case 'polygon':
          map.pm.enableDraw('Polygon', {
            snappable: true,
            snapDistance: 20,
            pathOptions: DEFAULT_SHAPE_STYLE,
          });
          break;
        case 'polyline':
          map.pm.enableDraw('Line', {
            snappable: true,
            snapDistance: 20,
            pathOptions: DEFAULT_SHAPE_STYLE,
          });
          break;
        case 'rectangle':
          map.pm.enableDraw('Rectangle', {
            snappable: true,
            snapDistance: 20,
            pathOptions: DEFAULT_SHAPE_STYLE,
          });
          break;
        case 'text':
          map.pm.enableDraw('Text', {
            textOptions: {
              text: 'Beschriftung',
              className: 'lagekarte-text-marker',
            },
          });
          break;
        case 'edit':
          map.pm.enableGlobalEditMode();
          break;
        case 'delete':
          map.pm.enableGlobalRemovalMode();
          break;
        default:
          // Unknown tool
          break;
      }

      // Deselect shape when tool changes
      selectShape(null);
      setActiveDrawingTool(tool);
    },
    [map, disableAllPmModes],
  );

  /**
   * Cleanup PM Controls bei Unmount
   */
  useEffect(() => {
    return () => {
      // Defensive check: Ensure PM still available during cleanup
      if (map.pm?.Toolbar) {
        map.pm.removeControls();
      }

      setPmInitialized(false);
    };
  }, [map]);

  return {
    initializePm,
    activateTool,
    disableAllPmModes,
  };
};
