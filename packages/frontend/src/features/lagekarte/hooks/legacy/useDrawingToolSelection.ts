import { useEffect } from 'react';
import type * as L from 'leaflet';
import type { DrawingTool } from '@/components/organisms/lagekarte/toolbar/DrawingToolbar';
import { DEFAULT_SHAPE_STYLE } from '@/features/lagekarte/utils';

interface UseDrawingToolSelectionProps {
  map: L.Map;
  selectedTool?: DrawingTool | null;
  setSelectedShapeId: (id: string | null) => void;
}

/**
 * Handle Drawing-Tool selection from Toolbar
 * Activates/deactivates Leaflet.PM drawing modes based on selected tool
 */
export const useDrawingToolSelection = ({ map, selectedTool, setSelectedShapeId }: UseDrawingToolSelectionProps) => {
  useEffect(() => {
    // Defensive check before activating any drawing mode
    if (!map.pm?.Toolbar) {
      console.warn('[useDrawingToolSelection] Leaflet.PM not available, cannot activate tool:', selectedTool);
      return;
    }

    const disableAllPmModes = () => {
      const safeDisable = (action: () => void, label: string) => {
        try {
          action();
        } catch (error) {
          console.warn(`[useDrawingToolSelection] Failed to disable ${label}`, error);
        }
      };

      safeDisable(() => map.pm.disableDraw(), 'draw mode');

      if (typeof map.pm.globalEditModeEnabled === 'function' && map.pm.globalEditModeEnabled()) {
        safeDisable(() => map.pm.disableGlobalEditMode(), 'global edit mode');
      }

      if (typeof map.pm.globalRemovalModeEnabled === 'function' && map.pm.globalRemovalModeEnabled()) {
        safeDisable(() => map.pm.disableGlobalRemovalMode(), 'global removal mode');
      }
    };

    if (!selectedTool) {
      disableAllPmModes();
      // Deselect shape when tool is cleared
      setSelectedShapeId(null);
      return;
    }

    // Activate drawing mode based on selected tool
    switch (selectedTool) {
      case 'select':
        disableAllPmModes();
        // Click-to-Select bleibt aktiv (bereits in separatem useEffect)
        break;
      case 'polygon':
        disableAllPmModes();
        map.pm.enableDraw('Polygon', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'polyline':
        disableAllPmModes();
        map.pm.enableDraw('Line', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'rectangle':
        disableAllPmModes();
        map.pm.enableDraw('Rectangle', {
          snappable: true,
          snapDistance: 20,
          pathOptions: DEFAULT_SHAPE_STYLE,
        });
        break;
      case 'text':
        disableAllPmModes();
        map.pm.enableDraw('Text', {
          textOptions: {
            text: 'Beschriftung',
            className: 'lagekarte-text-marker',
          },
        });
        break;
      case 'edit':
        disableAllPmModes();
        map.pm.enableGlobalEditMode();
        break;
      case 'delete':
        disableAllPmModes();
        map.pm.enableGlobalRemovalMode();
        break;
      default:
        disableAllPmModes();
    }

    // Deselect shape when tool changes
    setSelectedShapeId(null);

    // Cleanup: Deactivate when tool changes (mit defensive checks)
    return () => {
      if (map.pm?.Toolbar) {
        disableAllPmModes();
      }
    };
  }, [selectedTool, map, setSelectedShapeId]);
};
