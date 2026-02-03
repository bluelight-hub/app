import { useState } from 'react';
import { PiCaretDown, PiCaretUp, PiMetronome } from 'react-icons/pi';
import { cn } from '@/shared/ui/cn';

interface EintragInfo {
  id: string;
  titel: string;
  intervallMinuten: number;
  offsetMinuten: number;
  sortOrder: number;
}

interface FuehrungsrhythmusTemplateCardProps {
  name: string;
  beschreibung: string | null;
  eintraege: EintragInfo[];
  className?: string;
}

/**
 * Atom: Fuehrungsrhythmus-Template anzeigen mit aufklappbarer Eintragsliste (Story 6.6 AC2).
 */
export function FuehrungsrhythmusTemplateCard({ name, beschreibung, eintraege, className }: FuehrungsrhythmusTemplateCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={cn('rounded-lg border-2 border-gray-200 bg-white transition-colors', 'hover:border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:hover:border-gray-600', className)}>
      {/* Header */}
      <button type="button" onClick={() => setIsExpanded((prev) => !prev)} className="flex w-full items-start justify-between gap-3 p-4" aria-expanded={isExpanded}>
        <div className="min-w-0 flex-1 text-left">
          <div className="flex items-center gap-2">
            <PiMetronome className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <h3 className="truncate font-semibold text-gray-900 text-sm dark:text-white">{name}</h3>
          </div>
          {beschreibung && <p className="mt-1 line-clamp-2 text-gray-500 text-xs dark:text-gray-400">{beschreibung}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap rounded-full bg-amber-100 px-2.5 py-1 font-medium text-amber-700 text-xs dark:bg-amber-900/30 dark:text-amber-300">
            {eintraege.length} {eintraege.length === 1 ? 'Erinnerung' : 'Erinnerungen'}
          </span>
          {isExpanded ? <PiCaretUp className="h-4 w-4 text-gray-400" /> : <PiCaretDown className="h-4 w-4 text-gray-400" />}
        </div>
      </button>

      {/* Eintraege-Liste (aufklappbar) */}
      {isExpanded && (
        <div className="border-gray-200 border-t px-4 pb-4 pt-3 dark:border-gray-700">
          <div className="space-y-2">
            {eintraege
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((eintrag) => (
                <div key={eintrag.id} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2 text-sm dark:bg-gray-800">
                  <span className="font-medium text-gray-700 dark:text-gray-300">{eintrag.titel}</span>
                  <div className="flex items-center gap-3 text-gray-500 text-xs dark:text-gray-400">
                    <span>alle {eintrag.intervallMinuten} Min</span>
                    {eintrag.offsetMinuten > 0 && <span className="rounded bg-gray-200 px-1.5 py-0.5 dark:bg-gray-700">+{eintrag.offsetMinuten} Min Offset</span>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
