import { Button } from '@/shared/ui/atoms/button.atom';
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

type ButtonProps = ComponentProps<typeof Button>;

export interface ConfirmButtonProps extends Omit<ButtonProps, 'children' | 'onClick'> {
  children: ReactNode;
  confirmLabel?: ReactNode;
  confirmIntent?: ButtonProps['intent'];
  confirmAppearance?: ButtonProps['appearance'];
  confirmationWindowMs?: number;
  onConfirm: () => void | Promise<void>;
}

/**
 * Wiederverwendbarer Zwei-Klick-Bestätigungsbutton.
 *
 * Der erste Klick aktiviert den Bestätigungszustand, der zweite führt die
 * Aktion aus. Der Zustand wird bei Außenklick, Escape oder nach Timeout
 * zurückgesetzt.
 */
export function ConfirmButton({
  children,
  confirmLabel = 'Erneut klicken',
  confirmIntent,
  confirmAppearance,
  confirmationWindowMs = 4000,
  intent = 'warning',
  appearance = 'outline',
  loading = false,
  onConfirm,
  onKeyDown,
  title,
  ...buttonProps
}: ConfirmButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!isConfirming || loading) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsConfirming(false);
    }, confirmationWindowMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [confirmationWindowMs, isConfirming, loading]);

  useEffect(() => {
    if (!isConfirming) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) {
        setIsConfirming(false);
      }
    };

    document.addEventListener('pointerdown', handlePointerDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isConfirming]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Escape' && isConfirming) {
      event.preventDefault();
      setIsConfirming(false);
      return;
    }

    onKeyDown?.(event);
  };

  const handleClick = async () => {
    if (loading) {
      return;
    }

    if (!isConfirming) {
      setIsConfirming(true);
      return;
    }

    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <Button
      {...buttonProps}
      ref={buttonRef}
      intent={isConfirming ? (confirmIntent ?? intent) : intent}
      appearance={isConfirming ? (confirmAppearance ?? 'filled') : appearance}
      loading={loading}
      aria-pressed={isConfirming}
      title={isConfirming ? 'Erneut klicken zum Bestätigen' : title}
      onClick={() => void handleClick()}
      onKeyDown={handleKeyDown}
    >
      {isConfirming ? confirmLabel : children}
    </Button>
  );
}
