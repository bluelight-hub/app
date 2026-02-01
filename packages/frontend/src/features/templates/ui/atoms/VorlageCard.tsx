import { PiClock } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface VorlageCardProps {
  titel: string;
  minuten: number;
  beschreibung: string | null;
  className?: string;
}

/**
 * Atom: Einzelne Vorlage anzeigen.
 */
export function VorlageCard({ titel, minuten, beschreibung, className }: VorlageCardProps) {
  return (
    <div className={cn('rounded-lg border-2 border-gray-200 bg-white p-4 transition-colors', 'hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{titel}</h3>
          {beschreibung && <p className="mt-1 line-clamp-2 text-gray-500 text-xs dark:text-gray-400">{beschreibung}</p>}
        </div>
        <div className="flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 dark:bg-amber-900/30">
          <PiClock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="font-medium text-amber-700 text-xs dark:text-amber-300">{minuten} Min</span>
        </div>
      </div>
    </div>
  );
}
