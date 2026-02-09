import { cn } from '@/shared/ui/cn';

interface KategorieChipProps {
  name: string;
  farbe: string;
  className?: string;
}

/**
 * Atom: Kleines Badge mit Farbpunkt und Kategorie-Name (Story 8.1).
 */
export function KategorieChip({ name, farbe, className }: KategorieChipProps) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 font-medium text-gray-700 text-xs', 'dark:bg-gray-700 dark:text-gray-300', className)}>
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: farbe }} aria-hidden="true" />
      {name}
    </span>
  );
}
