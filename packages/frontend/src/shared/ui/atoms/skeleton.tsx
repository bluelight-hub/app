import type { ComponentPropsWithoutRef } from 'react';
import { cn } from '@/shared/ui/cn';

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  /**
   * Zusätzliche CSS-Klassen für das Skeleton-Element (z.B. für Größe und Form).
   */
  className?: string;
}

/**
 * Skeleton Loading Component.
 *
 * Zeigt einen animierten Platzhalter während Daten geladen werden.
 */
export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return <div className={cn('animate-pulse rounded bg-surface-raised', className)} {...props} />;
};
