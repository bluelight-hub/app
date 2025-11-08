import { useEffect } from 'react';
import type * as L from 'leaflet';
import type { DrawingTool } from '@/components/organisms/lagekarte/toolbar/DrawingToolbar';
import { DEFAULT_SHAPE_STYLE } from '@/utils/drawing-styles';

interface UseDrawingToolSelectionProps {
  map: L.Map;
  selectedTool: DrawingTool;
  setSelectedShapeId: (id: string | null) => void;
}

/**
 * Handle Drawing-Tool selection from Toolbar
 * Activates/deactivates Leaflet.PM drawing modes based on selected tool
 */
export const useDrawingToolSelection = ({ map, selectedTool, setSelectedShapeId }: UseDrawingToolSelectionProps) => {
  useEffect(() => {
    if (!selectedTool) {
      // Deactivate all drawing modes (mit defensive checks)
      if (map.pm?.Toolbar) {
        map.pm.disableDraw();
        map.pm.disableGlobalEditMode();
        map.pm.disableGlobalRemovalMode();
      }
      // Deselect shape when tool is cleared
      setSelectedShapeId(null);
      return;
    }

    // Defensive check before activating any drawing mode
    if (!map.pm?.Toolbar) {
      console.warn('[useDrawingToolSelection] Leaflet.PM not available, cannot activate tool:', selectedTool);
      return;
    }

    // Activate drawing mode based on selected tool
    switch (selectedTool) {
      case 'select':
        map.pm.disableDraw();
        map.pm.disableGlobalEditMode();
        map.pm.disableGlobalRemovalMode();
        // Click-to-Select bleibt aktiv (bereits in separatem useEffect)
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
        map.pm.disableDraw();
        map.pm.enableGlobalEditMode();
        break;
      case 'delete':
        map.pm.disableDraw();
        map.pm.enableGlobalRemovalMode();
        break;
      default:
        map.pm.disableDraw();
    }

    // Deselect shape when tool changes
    setSelectedShapeId(null);

    // Cleanup: Deactivate when tool changes (mit defensive checks)
    return () => {
      if (map.pm?.Toolbar) {
        map.pm.disableDraw();
        map.pm.disableGlobalEditMode();
        map.pm.disableGlobalRemovalMode();
      }
    };
  }, [selectedTool, map, setSelectedShapeId]);
};
