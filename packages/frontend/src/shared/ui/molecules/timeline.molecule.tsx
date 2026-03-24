import { cn } from '@/shared/ui/cn';
import type React from 'react';

interface TimelineProps {
  children: React.ReactNode;
  className?: string;
}

interface TimelineItemProps {
  children: React.ReactNode;
  className?: string;
  showLine?: boolean;
}

interface TimelineDotProps {
  variant?: 'primary' | 'secondary';
  className?: string;
}

/**
 * Timeline Container Component
 *
 * Wrapper für Timeline-Elemente mit vertikalem Spacing
 */
export function Timeline({ children, className }: TimelineProps) {
  return <div className={cn('space-y-6', className)}>{children}</div>;
}

/**
 * Timeline Item Component
 *
 * Einzelner Eintrag in der Timeline mit relativer Positionierung für Dot und Line
 */
export function TimelineItem({ children, className, showLine = true }: TimelineItemProps) {
  return (
    <div className={cn('relative pl-8', className)}>
      {showLine && <div className="absolute top-6 bottom-0 left-3 w-0.5 bg-border-subtle" />}
      {children}
    </div>
  );
}

/**
 * Timeline Dot Component
 *
 * Punkt am Anfang eines Timeline-Items
 */
export function TimelineDot({ variant = 'secondary', className }: TimelineDotProps) {
  const variantClasses = {
    primary: 'bg-action-primary ring-surface-canvas',
    secondary: 'bg-surface-raised ring-surface-canvas',
  };

  const innerDotClasses = {
    primary: 'bg-surface-panel',
    secondary: 'bg-surface-panel',
  };

  return (
    <div className={cn('absolute top-0 left-0 flex h-6 w-6 items-center justify-center rounded-full ring-4', variantClasses[variant], className)}>
      <div className={cn('h-2 w-2 rounded-full', innerDotClasses[variant])} />
    </div>
  );
}

/**
 * Timeline Content Component
 *
 * Container für den Inhalt eines Timeline-Items
 */
Timeline.Item = TimelineItem;
Timeline.Dot = TimelineDot;
