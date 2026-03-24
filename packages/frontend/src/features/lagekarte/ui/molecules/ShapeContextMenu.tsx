import { cn } from '@/shared/ui/cn';
import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import type React from 'react';
import { PiPalette, PiPencil, PiTrash } from 'react-icons/pi';

export interface ShapeContextMenuProps {
  /**
   * Whether the context menu is open
   */
  isOpen: boolean;

  /**
   * Position of the context menu (in viewport coordinates)
   */
  position: { x: number; y: number } | null;

  /**
   * Callback when menu is closed
   */
  onClose: () => void;

  /**
   * Callback when "Bearbeiten" is clicked
   */
  onEdit: () => void;

  /**
   * Callback when "Löschen" is clicked
   */
  onDelete: () => void;

  /**
   * Callback when "Stil ändern" is clicked
   */
  onChangeStyle: () => void;
}

/**
 * Context Menu für Rechtsklick-Aktionen auf Lagekarte Shapes
 *
 * Features:
 * - Headless UI Menu für Accessibility
 * - Fixed Positioning mit viewport boundary checking
 * - Glassmorphism-Styling
 * - Icons: PiPencil (Edit), PiTrash (Delete), PiPalette (Style)
 * - Keyboard-Navigation mit Arrow Keys
 * - Closes when clicking outside
 *
 * @example
 * ```tsx
 * const [contextMenu, setContextMenu] = useState<{
 *   isOpen: boolean;
 *   position: { x: number; y: number };
 * } | null>(null);
 *
 * <ShapeContextMenu
 *   isOpen={contextMenu?.isOpen ?? false}
 *   position={contextMenu?.position ?? null}
 *   onClose={() => setContextMenu(null)}
 *   onEdit={() => {
 *     // Handle edit
 *     setContextMenu(null);
 *   }}
 *   onDelete={() => {
 *     // Handle delete
 *     setContextMenu(null);
 *   }}
 *   onChangeStyle={() => {
 *     // Handle style change
 *     setContextMenu(null);
 *   }}
 * />
 * ```
 */
export const ShapeContextMenu: React.FC<ShapeContextMenuProps> = ({ isOpen, position, onClose, onEdit, onDelete, onChangeStyle }) => {
  // Calculate position with viewport boundary checking
  const getPosition = (): React.CSSProperties => {
    if (!position) return {};

    let top = position.y;
    let left = position.x;

    // Check viewport boundaries (assuming menu is ~180px wide, ~140px tall)
    const menuWidth = 180;
    const menuHeight = 140;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const padding = 10; // Padding from viewport edges

    // Adjust horizontal position if menu would overflow
    if (left + menuWidth + padding > viewportWidth) {
      left = viewportWidth - menuWidth - padding;
    }

    // Adjust vertical position if menu would overflow
    if (top + menuHeight + padding > viewportHeight) {
      top = viewportHeight - menuHeight - padding;
    }

    // Ensure minimum padding from left/top
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      zIndex: 9999,
    };
  };

  // Don't render if not open
  if (!isOpen || !position) {
    return null;
  }

  return (
    <Menu as="div" className="relative">
      {/* Hidden MenuButton (required by Headless UI but invisible) */}
      <MenuButton className="hidden" />

      {/* Context Menu - positioned with boundary checking */}
      <MenuItems
        style={getPosition()}
        className={cn(
          'absolute rounded-lg border border-border-subtle bg-surface-panel/95 p-1.5 shadow-xl',
          'backdrop-blur-sm transition focus-visible:outline-none',
          'data-[closed]:scale-95 data-[closed]:opacity-0',
          'data-[enter]:duration-100 data-[leave]:duration-75',
          'min-w-max',
        )}
        onMouseLeave={onClose}
      >
        {/* Bearbeiten */}
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={() => {
                onEdit();
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                'text-text-secondary',
                focus ? 'bg-action-secondary text-text-primary' : 'hover:bg-action-secondary',
              )}
            >
              <PiPencil className="h-4 w-4" aria-hidden="true" />
              <span>Bearbeiten</span>
            </button>
          )}
        </MenuItem>

        {/* Stil ändern */}
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={() => {
                onChangeStyle();
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                'text-text-secondary',
                focus ? 'bg-action-secondary text-text-primary' : 'hover:bg-action-secondary',
              )}
            >
              <PiPalette className="h-4 w-4" aria-hidden="true" />
              <span>Stil ändern</span>
            </button>
          )}
        </MenuItem>

        {/* Separator */}
        <div className="my-1 border-border-subtle border-t" />

        {/* Löschen */}
        <MenuItem>
          {({ focus }) => (
            <button
              type="button"
              onClick={() => {
                onDelete();
                onClose();
              }}
              className={cn(
                'flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                'text-status-danger-text',
                focus ? 'bg-status-danger-surface' : 'hover:bg-status-danger-surface',
              )}
            >
              <PiTrash className="h-4 w-4" aria-hidden="true" />
              <span>Löschen</span>
            </button>
          )}
        </MenuItem>
      </MenuItems>

      {/* Invisible overlay to close menu on outside click */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={onClose}
          onContextMenu={(e) => {
            e.preventDefault();
            onClose();
          }}
          aria-hidden="true"
        />
      )}
    </Menu>
  );
};
