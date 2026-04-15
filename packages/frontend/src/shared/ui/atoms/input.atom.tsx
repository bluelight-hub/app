import { cn } from '@/shared/ui/cn';
import * as React from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  /**
   * Visuelle Variante:
   * - `default`: normale Border/Hover-Styles.
   * - `error`: Border und Hover in Danger-Farbe.
   * - `inline`: komplett transparent, ohne Border/Padding — für Chips oder
   *   schmale Inline-Zahlenfelder, die vom Container gestylt werden.
   */
  variant?: 'default' | 'error' | 'inline';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

const BASE_STYLES =
  'block w-full rounded-control border bg-surface-panel font-medium text-text-primary transition-colors duration-200 placeholder:text-text-muted focus:border-action-primary focus-visible:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50';

const INLINE_STYLES =
  'block border-0 bg-transparent font-medium text-text-primary placeholder:text-text-muted focus:outline-none focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

const VARIANTS = {
  default: 'border-border-subtle hover:border-border-strong',
  error: 'border-status-danger-border hover:border-status-danger-text focus:border-status-danger-text',
  inline: '',
};

const SIZES = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-3 py-1.5 text-sm',
  lg: 'px-3 py-2 text-sm',
};

const INLINE_SIZES = {
  sm: 'px-0 py-0 text-sm',
  md: 'px-0 py-0 text-sm',
  lg: 'px-0 py-0 text-sm',
};

/**
 * Input Atom Component
 *
 * Basis-Input-Komponente mit Tailwind CSS Styling
 */
export const Input = React.memo(
  React.forwardRef<HTMLInputElement, InputProps>(
    (
      { className, variant = 'default', inputSize = 'md', autoCorrect = 'off', autoComplete = 'off', autoCapitalize = 'off', spellCheck = false, fullWidth = false, leftIcon, rightElement, ...props },
      ref,
    ) => {
      const isInline = variant === 'inline';
      const inputClasses = cn(
        isInline ? INLINE_STYLES : BASE_STYLES,
        VARIANTS[variant],
        isInline ? INLINE_SIZES[inputSize] : SIZES[inputSize],
        leftIcon && 'pl-12',
        rightElement && 'pr-12',
        fullWidth && 'w-full',
        className,
      );

      const nativeProps = {
        autoCorrect,
        autoComplete,
        autoCapitalize,
        spellCheck,
        'data-lpignore': 'true' as const,
        'data-1p-ignore': 'true' as const,
        'data-form-type': 'other' as const,
        ...props,
      };

      if (leftIcon || rightElement) {
        return (
          <div className="relative w-full">
            {leftIcon && <div className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-text-muted">{leftIcon}</div>}
            <input ref={ref} className={inputClasses} {...nativeProps} />
            {rightElement && <div className="absolute top-0 right-0 flex h-full items-center pr-1">{rightElement}</div>}
          </div>
        );
      }

      return <input ref={ref} className={inputClasses} {...nativeProps} />;
    },
  ),
);

Input.displayName = 'Input';
