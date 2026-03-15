import { clsx } from 'clsx';
import type { ReactNode } from 'react';

interface HeadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: ReactNode;
  className?: string;
}

/**
 * Heading-Komponente für Überschriften
 *
 * Bietet verschiedene Größen und semantische HTML-Elemente.
 */
export function Heading({ size = 'md', as: Component = 'h2', children, className }: HeadingProps) {
  const sizeClasses = {
    xs: 'text-body-xs font-semibold uppercase tracking-[0.16em]',
    sm: 'text-title-sm font-semibold',
    md: 'text-title-sm font-semibold',
    lg: 'text-title-md font-semibold',
    xl: 'text-title-lg font-semibold',
    '2xl': 'text-title-lg font-bold',
    '3xl': 'text-title-lg font-bold tracking-tight',
  };

  return <Component className={clsx('font-sans text-text-primary', sizeClasses[size], className)}>{children}</Component>;
}
