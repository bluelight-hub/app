import { PiBellRinging, PiNotepad } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

type ItemType = 'erinnerung' | 'notiz';

interface ItemTypeBadgeProps {
  type: ItemType;
  className?: string;
}

const variantStyles: Record<ItemType, string> = {
  erinnerung: 'bg-status-warning-surface text-status-warning-text',
  notiz: 'bg-surface-raised text-text-secondary',
};

const variantIcons: Record<ItemType, React.ReactNode> = {
  erinnerung: <PiBellRinging className="h-3 w-3" aria-hidden="true" />,
  notiz: <PiNotepad className="h-3 w-3" aria-hidden="true" />,
};

const variantLabels: Record<ItemType, string> = {
  erinnerung: 'Erinnerung',
  notiz: 'Notiz',
};

/**
 * Atom: Typ-Badge zur visuellen Unterscheidung von Erinnerungen und Notizen (Story 7.5 AC3).
 *
 * Erinnerung: Amber/Warm mit PiBellRinging
 * Notiz: Slate/Neutral mit PiNotepad
 * Dark Mode: AC4-konform mit angepassten Farbkontrasten
 */
export function ItemTypeBadge({ type, className }: ItemTypeBadgeProps) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium text-xs', variantStyles[type], className)}>
      {variantIcons[type]}
      {variantLabels[type]}
    </span>
  );
}
