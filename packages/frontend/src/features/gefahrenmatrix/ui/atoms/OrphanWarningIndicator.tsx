import { PiWarningCircle } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';
import { WARNSTUFE_LABELS, type WarnstufeValue } from '../../schemas/gefahrenmatrix.schema';

export interface OrphanWarningIndicatorProps {
  warnstufe: WarnstufeValue;
  className?: string;
}

const WARNSTUFE_TEXT: Record<WarnstufeValue, string> = {
  KEINE: 'text-warnstufe-keine-text',
  NIEDRIG: 'text-warnstufe-niedrig-text',
  MITTEL: 'text-warnstufe-mittel-text',
  HOCH: 'text-warnstufe-hoch-text',
  AKUT: 'text-warnstufe-akut-text',
};

/**
 * Kleiner Hinweis-Icon in der Matrix-Zelle: „Warnstufe vergeben, aber keine
 * Zone auf der Karte". Nicht gerendert, wenn `warnstufe === 'KEINE'` — dann
 * ist der Zustand trivial unauffällig.
 */
export function OrphanWarningIndicator({ warnstufe, className }: OrphanWarningIndicatorProps) {
  if (warnstufe === 'KEINE') {
    return null;
  }

  const label = `Warnstufe ${WARNSTUFE_LABELS[warnstufe]} ohne räumliche Verortung – offener Punkt`;

  return (
    <span className={cn('inline-flex items-center', WARNSTUFE_TEXT[warnstufe], className)} role="img" aria-label={label} title={label} data-orphan-warning>
      <PiWarningCircle className="size-3" aria-hidden />
    </span>
  );
}
