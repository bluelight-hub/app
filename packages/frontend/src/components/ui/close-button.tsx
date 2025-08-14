import { IconButton } from '@chakra-ui/react';
import { forwardRef } from 'react';
import { PiX } from 'react-icons/pi';
import type { ButtonProps } from '@chakra-ui/react';

export type CloseButtonProps = ButtonProps;

export const CloseButton = forwardRef<HTMLButtonElement, CloseButtonProps>(function CloseButton(props, ref) {
  return (
    <IconButton ref={ref} aria-label="Close" variant="ghost" {...props}>
      <PiX />
    </IconButton>
  );
});
