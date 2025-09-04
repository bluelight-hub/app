import { cn } from '@/utils/cn.ts';
import { InlineSpinner } from '@atoms/spinner.atom.tsx';
import { Button as HeadlessButton } from '@headlessui/react';
import * as React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'minimal';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  fullWidth?: boolean;
  loading?: boolean;
  kbd?: string; // Keyboard shortcut to display
  animate?: boolean; // Enable/disable hover animations
  children: React.ReactNode;
}

/**
 * Button Atom Component
 *
 * Basis-Button-Komponente mit Tailwind CSS Styling
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = 'button', variant = 'primary', size = 'md', fullWidth = false, loading = false, disabled, kbd, animate = false, children, ...props }, ref) => {
    const baseStyles =
      'group cursor-pointer inline-flex items-center justify-center font-medium transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-opacity-20 disabled:opacity-50 disabled:cursor-not-allowed border-2';

    // Animation classes only applied when animate=true
    const animationStyles = animate ? 'hover:-translate-y-0.5 active:translate-y-0 transition-transform' : '';

    const variants = {
      primary:
        'bg-primary-500 border-primary-500 text-white hover:bg-primary-600 hover:border-primary-600 focus:ring-primary-500 dark:bg-primary-600 dark:border-primary-600 dark:hover:bg-primary-700 dark:hover:border-primary-700',
      secondary:
        'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400 focus:ring-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700 dark:hover:border-gray-500',
      ghost: 'bg-transparent border-transparent text-gray-700 hover:bg-gray-100 hover:border-gray-200 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:border-gray-700',
      danger: 'bg-red-500 border-red-500 text-white hover:bg-red-600 hover:border-red-600 focus:ring-red-500 dark:bg-red-600 dark:border-red-600 dark:hover:bg-red-700 dark:hover:border-red-700',
      minimal: 'bg-transparent border-transparent text-gray-500 hover:text-gray-700 focus:ring-gray-500 dark:text-gray-400 dark:hover:text-gray-200',
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5 rounded-lg',
      md: 'text-base px-4 py-2.5 rounded-lg',
      lg: 'text-base px-6 py-3.5 rounded-lg',
      icon: 'p-2.5 rounded-lg', // Square padding for icon-only buttons
    };

    // Keyboard shortcut badge styles based on variant
    const kbdStyles = {
      primary: 'bg-white/20 text-white/90 group-hover:bg-white/25',
      secondary: 'bg-gray-100 text-gray-600 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300',
      ghost: 'bg-gray-100 text-gray-600 group-hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300',
      danger: 'bg-red-100 text-red-700 group-hover:bg-red-200 dark:bg-red-900/30 dark:text-red-200',
      minimal: 'bg-gray-100 text-gray-500 group-hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400',
    };

    return (
      <HeadlessButton
        aria-busy={loading}
        className={cn(baseStyles, variants[variant], sizes[size], animationStyles, fullWidth && 'w-full', className)}
        disabled={disabled || loading}
        type={type}
        ref={ref}
        {...props}
      >
        {loading ? (
          <InlineSpinner />
        ) : (
          <>
            {children}
            {kbd && (
              <kbd className={cn('ml-2 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 font-medium text-xs', kbdStyles[variant])}>
                {kbd.split('+').map((key) => (
                  <span key={key}>{key === 'cmd' || key === 'Cmd' ? '⌘' : key}</span>
                ))}
              </kbd>
            )}
          </>
        )}
      </HeadlessButton>
    );
  },
);

Button.displayName = 'Button';
