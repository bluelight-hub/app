import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/shared/lib/cn';

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Die Höhe des Skeleton-Elements.
   */
  className?: string;
}

/**
 * Skeleton Loading Component.
 *
 * Zeigt einen animierten Platzhalter während Daten geladen werden.
 */
export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return <div className={cn('animate-pulse rounded bg-gray-200 dark:bg-gray-700', className)} {...props} />;
};
