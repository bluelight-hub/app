import { cn } from '@/shared/ui/cn';
import { IconButton } from '../atoms/icon-button.atom';
import type { InputProps } from '../atoms/input.atom';
import { Input } from '../atoms/input.atom';
import * as React from 'react';
import { useState } from 'react';
import { PiEye, PiEyeClosed, PiLock, PiWarning } from 'react-icons/pi';

interface PasswordInputProps extends Omit<InputProps, 'type' | 'leftIcon' | 'rightElement'> {
  showLockIcon?: boolean;
  shouldShake?: boolean;
  wrapperClassName?: string;
}

/**
 * PasswordInput Molecule Component
 *
 * Kombination aus Input und IconButton für Passwort-Eingaben mit Show/Hide-Funktionalität
 * Inklusive Feststelltasten-Erkennung (Caps Lock).
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ showLockIcon = true, shouldShake = false, wrapperClassName, className, onKeyDown, onKeyUp, onClick, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const [capsLockActive, setCapsLockActive] = useState(false);

    const shakeStyles = shouldShake ? 'animate-shake' : '';

    const checkCapsLock = (e: React.KeyboardEvent | React.MouseEvent) => {
      if (e.getModifierState) {
        setCapsLockActive(e.getModifierState('CapsLock'));
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      checkCapsLock(e);
      onKeyDown?.(e);
    };

    const handleKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
      checkCapsLock(e);
      onKeyUp?.(e);
    };

    const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
      checkCapsLock(e);
      onClick?.(e);
    };

    return (
      <div className={cn(shakeStyles, wrapperClassName)}>
        <Input
          ref={ref}
          type={showPassword ? 'text' : 'password'}
          className={cn(className, capsLockActive && 'pr-20')}
          leftIcon={showLockIcon ? <PiLock size={18} /> : undefined}
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onClick={handleClick}
          rightElement={
            <div className="flex items-center gap-1 pr-1">
              {capsLockActive && <PiWarning className="h-5 w-5 text-amber-500" title="Feststelltaste ist aktiviert" aria-hidden="true" />}
              <IconButton
                type="button"
                aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                onClick={() => setShowPassword(!showPassword)}
                appearance="ghost"
                size="sm"
                disabled={props.disabled}
              >
                {showPassword ? <PiEyeClosed size={18} /> : <PiEye size={18} />}
              </IconButton>
            </div>
          }
          {...props}
        />
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
