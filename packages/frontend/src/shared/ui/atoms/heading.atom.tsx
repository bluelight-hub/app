import { cn } from '@/shared/ui/cn';
import { type ReactNode, memo } from 'react';

interface HeadingProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  children: ReactNode;
  className?: string;
}

const SIZE_CLASSES = {
  xs: 'text-xs font-semibold',
  sm: 'text-sm font-semibold',
  md: 'text-base font-semibold',
  lg: 'text-lg font-semibold',
  xl: 'text-xl font-bold',
  '2xl': 'text-2xl font-bold',
  '3xl': 'text-3xl font-bold',
};

/**
 * Heading-Komponente für Überschriften
 *
 * Bietet verschiedene Größen und semantische HTML-Elemente.
 */
export const Heading = memo(({ size = 'md', as: Component = 'h2', children, className }: HeadingProps) => {
  return <Component className={cn('text-gray-900 dark:text-white', SIZE_CLASSES[size], className)}>{children}</Component>;
});

Heading.displayName = 'Heading';
