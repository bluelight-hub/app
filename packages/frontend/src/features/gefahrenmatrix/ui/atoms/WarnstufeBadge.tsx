import { cn } from '@/shared/ui/cn';
import type { WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';
import { WARNSTUFE_LABELS } from '../../schemas/gefahrenmatrix.schema';

const WARNSTUFE_STYLES: Record<WarnstufeValue, string> = {
  KEINE: 'bg-surface-panel text-text-muted border-border-subtle',
  NIEDRIG: 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  MITTEL: 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-300 dark:border-yellow-800',
  HOCH: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-800',
  AKUT: 'bg-red-50 text-red-700 border-red-300 dark:bg-red-950 dark:text-red-300 dark:border-red-800 font-bold',
};

interface WarnstufeBadgeProps {
  warnstufe: WarnstufeValue;
  compact?: boolean;
}

/**
 * Farb-Badge für eine Warnstufe.
 */
export function WarnstufeBadge({ warnstufe, compact = false }: WarnstufeBadgeProps) {
  if (warnstufe === 'KEINE' && compact) return null;

  return (
    <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium', WARNSTUFE_STYLES[warnstufe])}>
      {compact ? warnstufe.charAt(0) : WARNSTUFE_LABELS[warnstufe]}
    </span>
  );
}
