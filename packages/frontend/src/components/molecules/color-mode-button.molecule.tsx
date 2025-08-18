import * as React from 'react';
import { useEffect, useState } from 'react';
import { ColorModeIcon } from '@atoms/color-mode-icon.atom';
import { IconButton } from '@atoms/icon-button.atom';
import type { IconButtonProps } from '@atoms/icon-button.atom';
import { useColorMode } from '@/hooks/use-color-mode';

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label' | 'children'>;

/**
 * Color Mode Button zum Umschalten zwischen Hell- und Dunkel-Modus
 *
 * Diese Komponente ist ein Molecule, da sie aus mehreren Atoms besteht
 * (IconButton + ColorModeIcon) und spezifische Logik enthält.
 */
export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(function ColorModeButton(props, ref) {
  const { toggleColorMode } = useColorMode();
  const [mounted, setMounted] = useState(false);

  // Verhindert Hydration-Mismatches bei SSR
  useEffect(() => {
    setMounted(true);
  }, []);

  // Skeleton während des Server-Side-Renderings
  if (!mounted) {
    return <div className="h-8 w-8 animate-pulse rounded-md bg-gray-200 dark:bg-gray-700" />;
  }

  return (
    <IconButton
      onClick={toggleColorMode}
      variant="outline"
      aria-label="Toggle color mode"
      size="md"
      ref={ref}
      className="border-gray-200/50 bg-white/80 backdrop-blur-sm hover:bg-white/90 dark:border-gray-700/50 dark:bg-gray-900/80 dark:hover:bg-gray-900/90"
      {...props}
    >
      <ColorModeIcon />
    </IconButton>
  );
});
