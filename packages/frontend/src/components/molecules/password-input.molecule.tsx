import * as React from 'react';
import { useState } from 'react';
import { PiEye, PiEyeClosed, PiLock } from 'react-icons/pi';
import { Input } from '@atoms/input.atom';
import { IconButton } from '@atoms/icon-button.atom';
import type { InputProps } from '@atoms/input.atom';
import { cn } from '@/lib/utils';

interface PasswordInputProps extends Omit<InputProps, 'type' | 'leftIcon' | 'rightElement'> {
  showLockIcon?: boolean;
  shouldShake?: boolean;
}

/**
 * PasswordInput Molecule Component
 *
 * Kombination aus Input und IconButton für Passwort-Eingaben mit Show/Hide-Funktionalität
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(({ showLockIcon = true, shouldShake = false, className, ...props }, ref) => {
  const [showPassword, setShowPassword] = useState(false);

  const shakeStyles = shouldShake ? 'animate-shake' : '';

  return (
    <div className={cn(shakeStyles, className)}>
      <Input
        ref={ref}
        type={showPassword ? 'text' : 'password'}
        leftIcon={showLockIcon ? <PiLock size={18} /> : undefined}
        rightElement={
          <IconButton
            type="button"
            aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
            onClick={() => setShowPassword(!showPassword)}
            variant="ghost"
            size="sm"
            className="mr-1"
            disabled={props.disabled}
          >
            {showPassword ? <PiEyeClosed size={18} /> : <PiEye size={18} />}
          </IconButton>
        }
        {...props}
      />
    </div>
  );
});

PasswordInput.displayName = 'PasswordInput';
