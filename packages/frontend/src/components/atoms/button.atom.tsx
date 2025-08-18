import * as React from 'react';
import { Button as HeadlessButton } from '@headlessui/react';
import { InlineSpinner } from '@atoms/spinner.atom.tsx';
import { cn } from '@/utils/cn.ts';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
  children: React.ReactNode;
}

/**
 * Button Atom Component
 *
 * Basis-Button-Komponente mit Tailwind CSS Styling
 */
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, type = 'button', variant = 'primary', size = 'md', fullWidth = false, loading = false, disabled, children, ...props }, ref) => {
    const baseStyles =
      'cursor-pointer inline-flex items-center justify-center font-semibold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700 focus:ring-red-500 shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0',
      secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-500',
      ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };

    const sizes = {
      sm: 'text-sm px-3 py-1.5 rounded-lg',
      md: 'text-base px-4 py-2 rounded-xl',
      lg: 'text-base px-6 py-4 rounded-xl',
    };

    return (
      <HeadlessButton aria-busy={loading} className={cn(baseStyles, variants[variant], sizes[size], fullWidth && 'w-full', className)} disabled={disabled || loading} type={type} ref={ref} {...props}>
        {loading ? <InlineSpinner /> : children}
      </HeadlessButton>
    );
  },
);

Button.displayName = 'Button';
