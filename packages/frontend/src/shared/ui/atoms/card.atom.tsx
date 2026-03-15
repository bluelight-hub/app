import { cn } from '@/shared/ui/cn';
import { type ReactNode, forwardRef, memo } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

const PADDING_CLASSES = {
  none: '',
  sm: 'p-4',
  md: 'p-6 sm:p-8',
  lg: 'p-8 sm:p-12',
  xl: 'p-10 sm:p-14',
};

/**
 * Card-Komponente für Container mit Hintergrund und Schatten
 *
 * Bietet eine konsistente Card-Darstellung mit verschiedenen Padding-Optionen.
 */
export const Card = memo(
  forwardRef<HTMLDivElement, CardProps>(({ children, className, padding = 'md' }, ref) => {
    return (
      <div ref={ref} className={cn('relative rounded-panel border border-border-subtle bg-surface-panel shadow-panel', PADDING_CLASSES[padding], className)}>
        {children}
      </div>
    );
  }),
);

Card.displayName = 'Card';
