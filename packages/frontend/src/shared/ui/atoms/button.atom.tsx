import { cn } from '@/shared/ui/cn';
import { InlineSpinner } from './spinner.atom.tsx';
import { Button as HeadlessButton } from '@headlessui/react';
import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  intent?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success' | 'info';
  appearance?: 'filled' | 'outline' | 'ghost' | 'minimal' | 'heavy';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  kbd?: string; // Keyboard shortcut to display
  animate?: boolean; // Enable/disable hover animations
  children: React.ReactNode;
}

const BASE_STYLES =
  'group inline-flex cursor-pointer items-center justify-center gap-2 rounded-control border font-medium font-sans transition-[background-color,border-color,color,box-shadow,transform] duration-150 focus:outline-none focus-visible:shadow-focus-ring disabled:cursor-not-allowed disabled:opacity-50';

const INTENT_COLORS = {
  primary: {
    filled: 'border-transparent bg-action-primary text-text-inverse shadow-button-primary hover:bg-action-primary-hover',
    outline: 'border-action-primary/35 bg-surface-panel text-action-primary hover:border-action-primary hover:bg-primary-50 dark:hover:bg-primary-950/50',
    ghost: 'border-transparent bg-transparent text-action-primary hover:bg-primary-50 dark:hover:bg-primary-950/40',
    minimal: 'border-transparent bg-transparent text-text-secondary hover:text-action-primary',
    heavy: 'border-transparent bg-action-primary text-text-inverse shadow-button-primary hover:bg-action-primary-hover',
  },
  secondary: {
    filled: 'border-border-subtle bg-action-secondary text-text-primary hover:border-border-strong hover:bg-action-secondary-hover',
    outline: 'border-border-subtle bg-surface-panel text-text-primary hover:border-border-strong hover:bg-action-secondary-hover',
    ghost: 'border-transparent bg-transparent text-text-secondary hover:bg-action-secondary',
    minimal: 'border-transparent bg-transparent text-text-muted hover:text-text-primary',
    heavy: 'border-border-subtle bg-surface-panel text-text-primary shadow-raised hover:border-border-strong hover:bg-action-secondary-hover',
  },
  danger: {
    filled: 'border-status-danger-text bg-status-danger-text text-text-inverse hover:opacity-90',
    outline: 'border-status-danger-border bg-status-danger-surface text-status-danger-text hover:border-status-danger-text hover:bg-status-danger-surface',
    ghost: 'border-transparent bg-transparent text-status-danger-text hover:bg-status-danger-surface',
    minimal: 'border-transparent bg-transparent text-status-danger-text hover:opacity-80',
    heavy: 'border-status-danger-text bg-status-danger-text text-text-inverse shadow-raised hover:opacity-90',
  },
  warning: {
    filled: 'border-status-warning-text bg-status-warning-text text-text-inverse hover:opacity-90',
    outline: 'border-status-warning-border bg-status-warning-surface text-status-warning-text hover:border-status-warning-text',
    ghost: 'border-transparent bg-transparent text-status-warning-text hover:bg-status-warning-surface',
    minimal: 'border-transparent bg-transparent text-status-warning-text hover:opacity-80',
    heavy: 'border-status-warning-text bg-status-warning-text text-text-inverse shadow-raised hover:opacity-90',
  },
  success: {
    filled: 'border-status-success-text bg-status-success-text text-text-inverse hover:opacity-90',
    outline: 'border-status-success-border bg-status-success-surface text-status-success-text hover:border-status-success-text',
    ghost: 'border-transparent bg-transparent text-status-success-text hover:bg-status-success-surface',
    minimal: 'border-transparent bg-transparent text-status-success-text hover:opacity-80',
    heavy: 'border-status-success-text bg-status-success-text text-text-inverse shadow-raised hover:opacity-90',
  },
  info: {
    filled: 'border-status-info-text bg-status-info-text text-text-inverse hover:opacity-90',
    outline: 'border-status-info-border bg-status-info-surface text-status-info-text hover:border-status-info-text',
    ghost: 'border-transparent bg-transparent text-status-info-text hover:bg-status-info-surface',
    minimal: 'border-transparent bg-transparent text-status-info-text hover:opacity-80',
    heavy: 'border-status-info-text bg-status-info-text text-text-inverse shadow-raised hover:opacity-90',
  },
};

const BORDER_STYLES = {
  filled: '',
  outline: '',
  ghost: '',
  minimal: '',
  heavy: '',
};

const SIZES = {
  sm: 'px-3 py-1.5',
  md: 'px-control-x py-control-y',
  lg: 'px-5 py-3',
  icon: 'p-2',
};

const CONTENT_SIZES = {
  sm: 'text-body-sm',
  md: 'text-body-sm',
  lg: 'text-body-md',
  icon: 'text-body-sm',
};

const KBD_INTENT_COLORS = {
  primary: 'bg-primary-100 text-primary-700 group-hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-100',
  secondary: 'bg-action-secondary text-text-secondary group-hover:bg-action-secondary-hover',
  danger: 'bg-status-danger-surface text-status-danger-text',
  warning: 'bg-status-warning-surface text-status-warning-text',
  success: 'bg-status-success-surface text-status-success-text',
  info: 'bg-status-info-surface text-status-info-text',
};

const KEY_MAP: Record<string, string> = {
  cmd: '⌘',
  ctrl: 'Ctrl',
  shift: '⇧',
  alt: '⌥',
  option: '⌥',
  enter: '↩︎',
};

/**
 * Button Atom Component
 *
 * Basis-Button-Komponente mit Tailwind CSS Styling
 *
 * @param intent - Semantische Bedeutung des Buttons (primary, secondary, danger, warning, success, info)
 * @param appearance - Visueller Stil des Buttons (filled, outline, ghost, minimal, heavy)
 */
export const Button = React.memo(
  React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, type = 'button', intent = 'primary', appearance = 'filled', size = 'md', fullWidth = false, loading = false, disabled, kbd, animate = false, children, ...props }, ref) => {
      // Animation classes only applied when animate=true
      const animationStyles = animate ? 'hover:-translate-y-px active:translate-y-0' : '';

      // Keyboard shortcut badge styles based on intent and appearance
      const kbdStyles =
        appearance === 'filled'
          ? intent === 'secondary'
            ? 'bg-surface-panel/70 text-text-secondary group-hover:bg-surface-panel'
            : 'bg-surface-inverse/16 text-text-inverse group-hover:bg-surface-inverse/24'
          : KBD_INTENT_COLORS[intent];

      return (
        <HeadlessButton
          aria-busy={loading}
          aria-live={loading ? 'polite' : undefined}
          className={cn(BASE_STYLES, BORDER_STYLES[appearance], INTENT_COLORS[intent][appearance], SIZES[size], animationStyles, fullWidth && 'w-full', 'relative', className)}
          disabled={disabled || loading}
          type={type}
          ref={ref}
          {...props}
        >
          {/* Loading Spinner - absolut positioniert über dem Content */}
          {loading && (
            <span className="absolute inset-0 flex items-center justify-center">
              <InlineSpinner size="sm" />
            </span>
          )}
          {/* Content - unsichtbar wenn loading, damit Button-Größe erhalten bleibt */}
          <span className={cn('inline-flex items-center', CONTENT_SIZES[size], loading && 'invisible')}>
            {children}
            {kbd && (
              <kbd className={cn('ml-2 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium text-xs', kbdStyles)}>
                {kbd.split('+').map((key) => {
                  const normalizedKey = key.trim().toLowerCase();
                  const displayKey = KEY_MAP[normalizedKey] || key.charAt(0).toUpperCase() + key.slice(1).toLowerCase();
                  return <span key={key}>{displayKey}</span>;
                })}
              </kbd>
            )}
          </span>
        </HeadlessButton>
      );
    },
  ),
);

Button.displayName = 'Button';
