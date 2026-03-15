import { useColorMode } from '@/shared/hooks/use-color-mode';
import { cn } from '@/shared/ui/cn';
import { ColorModeIcon } from '../atoms/color-mode-icon.atom';
import type { IconButtonProps } from '../atoms/icon-button.atom';
import { IconButton } from '../atoms/icon-button.atom';
import * as React from 'react';
import { useEffect, useState } from 'react';

type ColorModeButtonProps = Omit<IconButtonProps, 'appearance' | 'aria-label' | 'children' | 'intent' | 'onClick' | 'size' | 'title'>;

/**
 * Color Mode Button zum Umschalten zwischen Hell-, Dunkel- und System-Modus
 *
 * Diese Komponente ist ein Molecule, da sie aus mehreren Atoms besteht
 * (IconButton + ColorModeIcon) und spezifische Logik enthält.
 *
 * Der Zyklus beim Klicken: Light → Dark → System → Light
 */
export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(function ColorModeButtonComponent({ className, ...props }, ref) {
  const { toggleColorMode, colorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  // Verhindert Hydration-Mismatches bei SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Skeleton während des Server-Side-Renderings
  if (!mounted) {
    return <div className="h-9 w-9 animate-pulse rounded-control bg-surface-raised" />;
  }

  // Dynamisches aria-label basierend auf aktuellem Modus
  const getAriaLabel = () => {
    switch (colorMode) {
      case 'light':
        return 'Zu Dunkelmodus wechseln';
      case 'dark':
        return 'Zu Systemmodus wechseln';
      case 'system':
        return 'Zu Hellmodus wechseln';
      default:
        return 'Farbmodus umschalten';
    }
  };

  return (
    <IconButton
      onClick={toggleColorMode}
      appearance="outline"
      aria-label={getAriaLabel()}
      title={getAriaLabel()}
      size="md"
      ref={ref}
      className={cn('border-border-subtle bg-surface-overlay text-text-secondary shadow-raised backdrop-blur-sm hover:bg-surface-panel', className)}
      {...props}
    >
      <ColorModeIcon />
    </IconButton>
  );
});
