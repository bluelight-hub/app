import { useNavigate } from '@tanstack/react-router';
import { PiX } from 'react-icons/pi';
import { cn } from '@/utils/cn';
import { useCallback, useEffect } from 'react';

/**
 * Props für die FullscreenCloseButton-Komponente
 */
interface FullscreenCloseButtonProps {
  /**
   * Callback beim Schließen
   * Optional - falls nicht angegeben wird zur Standard-Mode navigiert
   */
  onClose?: () => void;
}

/**
 * Close-Button für Fullscreen-Modus der Lagekarte
 *
 * Features:
 * - Fixed Positioning (top-right)
 * - Navigiert zurück zu Standard-Modus
 * - Keyboard-Support (Escape-Key)
 * - Accessible (aria-label)
 * - Dark-Mode Support
 *
 * @component
 * @example
 * ```tsx
 * <FullscreenCloseButton />
 * <FullscreenCloseButton onClose={() => console.log('closed')} />
 * ```
 */
export const FullscreenCloseButton: React.FC<FullscreenCloseButtonProps> = ({ onClose }) => {
  const navigate = useNavigate();

  /**
   * Handler für Close-Button
   * Navigiert zurück zu Standard-Modus oder ruft custom onClose auf
   * Memoized mit useCallback um stale closures zu vermeiden
   */
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      navigate({
        search: { mode: 'standard' },
        replace: true,
      });
    }
  }, [onClose, navigate]);

  /**
   * Keyboard-Handler für Escape-Key
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('keydown', handleEscape);
    };
  }, [handleClose]);

  return (
    <button
      onClick={handleClose}
      className={cn(
        'fixed top-4 right-4 z-[1000]',
        'bg-white dark:bg-gray-800',
        'rounded-full p-2 shadow-lg',
        'hover:bg-gray-100 dark:hover:bg-gray-700',
        'transition-colors duration-200',
        'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
      )}
      aria-label="Vollbildmodus schließen"
      type="button"
    >
      <PiX className="h-6 w-6 text-gray-700 dark:text-gray-200" />
    </button>
  );
};
