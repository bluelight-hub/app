import { ClientOnly, IconButton, IconButtonProps, Skeleton } from '@chakra-ui/react';
import * as React from 'react';
import { useColorMode } from '@/hooks/use-color-mode.ts';
import { ColorModeIcon } from '@atoms/color-mode-icon.atom.tsx';

type ColorModeButtonProps = Omit<IconButtonProps, 'aria-label'>;
export const ColorModeButton = React.forwardRef<HTMLButtonElement, ColorModeButtonProps>(function ColorModeButton(props, ref) {
  const { toggleColorMode } = useColorMode();
  return (
    <ClientOnly fallback={<Skeleton boxSize="8" />}>
      <IconButton
        onClick={toggleColorMode}
        variant="ghost"
        aria-label="Toggle color mode"
        size="sm"
        ref={ref}
        {...props}
        css={{
          _icon: {
            width: '5',
            height: '5',
          },
        }}
      >
        <ColorModeIcon />
      </IconButton>
    </ClientOnly>
  );
});
