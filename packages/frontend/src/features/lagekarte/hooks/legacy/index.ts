/**
 * Legacy Hooks für DrawingLayer
 *
 * Diese Hooks werden noch von DrawingLayer.tsx verwendet.
 * Für neue Entwicklungen sollten die konsolidierten Hooks verwendet werden:
 * - useLagekarteState
 * - useShapeActions
 * - useDrawingTools
 *
 * @deprecated Wird in Zukunft durch Store-basierte Hooks ersetzt
 * @see HOOK-ANALYSIS.md für Migrationsplan
 */

export { useDrawingToolSelection } from './useDrawingToolSelection';
export { useKeyboardShortcuts } from './useKeyboardShortcuts';
export { useLeafletPMControls } from './useLeafletPMControls';
export { useShapeEventHandlers } from './useShapeEventHandlers';
export { useShapeHighlighting } from './useShapeHighlighting';
export { useShapeLoading } from './useShapeLoading';
export { useShapeSelection } from './useShapeSelection';
export { useShapeStyleUpdates } from './useShapeStyleUpdates';
export { useTextMarkerHandling } from './useTextMarkerHandling';
export { useToolbarPositioning } from './useToolbarPositioning';
