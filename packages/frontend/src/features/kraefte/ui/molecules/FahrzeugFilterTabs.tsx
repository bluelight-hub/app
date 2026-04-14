/**
 * Filter-Tabs für die Fahrzeuge-Seite.
 *
 * Zeigt Tabs mit Zähler zum Filtern nach FMS-Status-Gruppen.
 * Default: "Alle" zeigt alle Fahrzeuge.
 */

import { cn } from '@/shared/ui/cn';

export type FahrzeugFilter = 'alle' | 'einsatz' | 'bereit' | 'andere';

interface FahrzeugFilterTabsProps {
  /** Aktuell aktiver Filter */
  activeFilter: FahrzeugFilter;
  /** Callback bei Filterwechsel */
  onFilterChange: (filter: FahrzeugFilter) => void;
  /** Anzahl Fahrzeuge pro Filter-Gruppe */
  counts: Record<FahrzeugFilter, number>;
}

const FILTER_OPTIONS: Array<{ value: FahrzeugFilter; label: string }> = [
  { value: 'alle', label: 'Alle' },
  { value: 'einsatz', label: 'Im Einsatz' },
  { value: 'bereit', label: 'Einsatzbereit' },
  { value: 'andere', label: 'Weitere' },
];

export function FahrzeugFilterTabs({ activeFilter, onFilterChange, counts }: FahrzeugFilterTabsProps) {
  return (
    <div className="flex space-x-1 rounded-panel bg-action-secondary p-1" role="tablist" aria-label="Fahrzeuge filtern">
      {FILTER_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={activeFilter === option.value}
          onClick={() => onFilterChange(option.value)}
          className={cn(
            'rounded-control px-3 py-1.5 text-sm leading-5 font-medium transition-colors',
            'focus-visible:shadow-focus-ring focus-visible:outline-none',
            activeFilter === option.value ? 'bg-surface-panel text-text-primary shadow' : 'text-text-secondary hover:bg-action-secondary-hover hover:text-text-primary',
          )}
        >
          {option.label} ({counts[option.value]})
        </button>
      ))}
    </div>
  );
}
