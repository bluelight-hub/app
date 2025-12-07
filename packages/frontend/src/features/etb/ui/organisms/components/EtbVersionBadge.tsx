import { Badge } from '@/shared/ui/atoms/badge.atom';
import { PiClockCounterClockwise } from 'react-icons/pi';
import { cn } from '@/shared/utils/cn';

interface EtbVersionBadgeProps {
  version: number;
  variant?: 'solid' | 'subtle';
  isCurrent?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Badge zur Anzeige der ETB-Eintrag-Version
 *
 * Nutzt das Badge-Atom mit versions-spezifischen Styles
 *
 * @param version - Die Versionsnummer
 * @param variant - Style-Variante: 'solid' (weiß auf farbig) oder 'subtle' (farbig auf hell)
 * @param isCurrent - Ob es die aktuelle Version ist (blaue Hervorhebung)
 * @param onClick - Optional: Callback für Klick (macht Badge zu einem Button)
 * @param className - Zusätzliche CSS-Klassen
 */
export function EtbVersionBadge({ version, variant = 'solid', isCurrent = false, onClick, className }: EtbVersionBadgeProps) {
  const variantClasses =
    variant === 'solid'
      ? {
          current: 'bg-primary-500 text-white',
          currentHover: 'hover:bg-primary-600',
          old: 'bg-gray-500 text-white',
          oldHover: 'hover:bg-gray-600',
        }
      : {
          current: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          currentHover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
          old: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
          oldHover: 'hover:bg-blue-200 dark:hover:bg-blue-900/50',
        };

  const content = (
    <>
      {onClick && <PiClockCounterClockwise className="h-3 w-3" />}v{version}
      {isCurrent && variant === 'solid' && ' (Aktuell)'}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="inline-flex items-center rounded-full" title="Versionshistorie anzeigen">
        <Badge
          size="sm"
          className={cn(
            'cursor-pointer gap-1 rounded-full transition-colors',
            isCurrent ? variantClasses.current : variantClasses.old,
            isCurrent ? variantClasses.currentHover : variantClasses.oldHover,
            className,
          )}
        >
          {content}
        </Badge>
      </button>
    );
  }

  return (
    <Badge size="sm" className={cn('gap-1 rounded-full', isCurrent ? variantClasses.current : variantClasses.old, className)}>
      {content}
    </Badge>
  );
}
