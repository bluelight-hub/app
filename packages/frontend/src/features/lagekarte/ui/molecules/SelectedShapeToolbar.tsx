import { PiPencil, PiTrash, PiPalette } from 'react-icons/pi';

/**
 * Position für Floating Toolbar
 */
interface Position {
  x: number;
  y: number;
}

/**
 * Props für SelectedShapeToolbar
 */
export interface SelectedShapeToolbarProps {
  /**
   * Selected Shape ID
   */
  shapeId: string;
  /**
   * Position basierend auf Shape-Bounds (Container-Koordinaten)
   */
  position: Position;
  /**
   * Edit Geometry Callback - Aktiviert Edit-Mode für Shape
   */
  onEdit: () => void;
  /**
   * Delete Shape Callback - Entfernt Shape von Karte
   */
  onDelete: () => void;
  /**
   * Change Style Callback - Öffnet Style-Editor
   */
  onChangeStyle: () => void;
}

/**
 * SelectedShapeToolbar - Floating Toolbar für selektierte Shapes
 *
 * Zeigt Quick-Actions wenn ein Shape selektiert ist:
 * - Edit Geometry (Pencil Icon)
 * - Delete (Trash Icon)
 * - Change Style (Palette Icon)
 *
 * Positioniert sich 20px unterhalb des Shape-Centers.
 * Nutzt Glassmorphism-Design mit Backdrop-Blur.
 *
 * @param shapeId - ID des selektierten Shapes
 * @param position - Container-Koordinaten für Toolbar-Position
 * @param onEdit - Callback für Edit-Mode Aktivierung
 * @param onDelete - Callback für Shape-Deletion
 * @param onChangeStyle - Callback für Style-Editor
 *
 * @example
 * ```tsx
 * <SelectedShapeToolbar
 *   shapeId="shape-123"
 *   position={{ x: 300, y: 400 }}
 *   onEdit={() => enableEditMode()}
 *   onDelete={() => deleteShape()}
 *   onChangeStyle={() => openStyleModal()}
 * />
 * ```
 */
export const SelectedShapeToolbar: React.FC<SelectedShapeToolbarProps> = ({ shapeId: _shapeId, position, onEdit, onDelete, onChangeStyle }) => {
  return (
    <div
      className="absolute z-50 flex gap-1 rounded-lg border border-border-subtle bg-surface-panel/90 p-1 shadow-lg backdrop-blur-sm"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, 0)', // Center horizontally above position
      }}
    >
      {/* Edit Geometry Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        className="flex min-h-10 min-w-10 items-center justify-center rounded p-2 hover:bg-action-secondary focus-visible:outline-none focus-visible:shadow-focus-ring md:h-8 md:w-8"
        title="Geometrie bearbeiten"
        aria-label="Geometrie bearbeiten"
      >
        <PiPencil className="h-4 w-4 text-text-secondary" />
      </button>

      {/* Delete Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="flex min-h-10 min-w-10 items-center justify-center rounded p-2 text-status-danger-text hover:bg-status-danger-surface focus-visible:outline-none focus-visible:shadow-focus-ring md:h-8 md:w-8"
        title="Shape löschen"
        aria-label="Shape löschen"
      >
        <PiTrash className="h-4 w-4" />
      </button>

      {/* Change Style Button */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onChangeStyle();
        }}
        className="flex min-h-10 min-w-10 items-center justify-center rounded p-2 hover:bg-action-secondary focus-visible:outline-none focus-visible:shadow-focus-ring md:h-8 md:w-8"
        title="Stil ändern"
        aria-label="Stil ändern"
      >
        <PiPalette className="h-4 w-4 text-text-secondary" />
      </button>
    </div>
  );
};
