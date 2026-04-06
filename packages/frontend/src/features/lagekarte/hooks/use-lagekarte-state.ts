import { useStore } from '@tanstack/react-store';
import { lagekarteStore } from '@/features/lagekarte';

/** Hook zum Lesen der Shapes (GeoJSON FeatureCollection) */
export const useShapes = () => useStore(lagekarteStore, (state) => state.shapes);

/** Hook zum Lesen der selektierten Shape-IDs */
export const useSelectedShapeIds = () => useStore(lagekarteStore, (state) => state.selectedShapeIds);

/** Hook zum Lesen des ersten selektierten Shapes (Single Selection Helper) */
export const useSelectedShapeId = () => {
  const selectedShapeIds = useStore(lagekarteStore, (state) => state.selectedShapeIds);
  return selectedShapeIds.size > 0 ? Array.from(selectedShapeIds)[0] : null;
};

/** Hook zum Lesen des aktiven Drawing Tools */
export const useActiveDrawingTool = () => useStore(lagekarteStore, (state) => state.activeDrawingTool);

/** Hook zum Lesen der Toolbar-Sichtbarkeit */
export const useToolbarVisible = () => useStore(lagekarteStore, (state) => state.toolbarVisible);

/** Hook zum Lesen der Toolbar-Position */
export const useToolbarPosition = () => useStore(lagekarteStore, (state) => state.toolbarPosition);

/** Hook zum Lesen des Context Menu State */
export const useContextMenu = () => useStore(lagekarteStore, (state) => state.contextMenu);

/** Hook zum Lesen des maximalen Shape-Limits */
export const useMaxShapes = () => useStore(lagekarteStore, (state) => state.maxShapes);

/** Hook zum Prüfen ob Shape-Limit erreicht ist */
export const useIsShapeLimitReached = () => {
  const shapes = useStore(lagekarteStore, (state) => state.shapes);
  const maxShapes = useStore(lagekarteStore, (state) => state.maxShapes);
  return shapes.features.length >= maxShapes;
};
