import { cn } from '@/shared/ui/cn';
import { useMemo } from 'react';
import { PiX } from 'react-icons/pi';
import type { KategorieResponseDto } from '@bluelight-hub/shared/client';
import { FilterChip } from '../atoms/FilterChip';
import type { TeamFilterType, Teilnehmer } from '../../stores';
import type { KategorieFilterType } from '../../stores';
import type { StatusFilterType, ErinnerungStatus } from '../../stores';

// Status-Farben (aus AlarmStateBadge Pattern)
const STATUS_COLORS: Record<ErinnerungStatus, string> = {
  GEPLANT: 'bg-green-100 border-green-300 text-green-700 dark:bg-green-900/30 dark:border-green-600 dark:text-green-300',
  AUSGELOEST: 'bg-red-100 border-red-300 text-red-700 dark:bg-red-900/30 dark:border-red-600 dark:text-red-300',
  ACKNOWLEDGED: 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-600 dark:text-blue-300',
  SNOOZED: 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:border-yellow-600 dark:text-yellow-300',
  ESKALIERT: 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300',
  ERLEDIGT: 'bg-gray-100 border-gray-300 text-gray-600 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400',
};

const TEAM_FILTER_COLOR = 'bg-indigo-100 border-indigo-300 text-indigo-700 dark:bg-indigo-900/30 dark:border-indigo-600 dark:text-indigo-300';

interface ActiveFiltersBarProps {
  teamFilter?: TeamFilterType;
  kategorieFilter?: KategorieFilterType;
  statusFilter?: StatusFilterType;
  kategorien?: KategorieResponseDto[];
  teilnehmer?: Teilnehmer[];
  onClearTeamFilter?: () => void;
  onClearKategorieFilter?: () => void;
  onClearStatusFilter?: () => void;
  onClearAll?: () => void;
  className?: string;
}

export function ActiveFiltersBar({
  teamFilter,
  kategorieFilter,
  statusFilter,
  kategorien = [],
  teilnehmer = [],
  onClearTeamFilter,
  onClearKategorieFilter,
  onClearStatusFilter,
  onClearAll,
  className,
}: ActiveFiltersBarProps) {
  // Zähle aktive Filter
  const activeFilters = useMemo(() => {
    const filters: Array<{
      type: 'team' | 'kategorie' | 'status';
      label: string;
      colorClass?: string;
      kategorieColor?: string;
      onRemove: () => void;
    }> = [];

    // Team-Filter Chip
    if (teamFilter && teamFilter.type !== 'all' && onClearTeamFilter) {
      let label = '';
      if (teamFilter.type === 'mine') label = 'Meine';
      else if (teamFilter.type === 'unassigned') label = 'Unzugewiesen';
      else if (teamFilter.type === 'user') {
        const user = teilnehmer.find((t) => t.id === teamFilter.userId);
        label = user?.name ?? 'Unbekannt';
      }
      filters.push({
        type: 'team',
        label,
        colorClass: TEAM_FILTER_COLOR,
        onRemove: onClearTeamFilter,
      });
    }

    // Kategorie-Filter Chip
    if (kategorieFilter && kategorieFilter.type !== 'all' && onClearKategorieFilter) {
      if (kategorieFilter.type === 'untagged') {
        filters.push({
          type: 'kategorie',
          label: 'Ohne Kategorie',
          colorClass: 'bg-gray-100 border-gray-300 text-gray-700 dark:bg-gray-800/50 dark:border-gray-600 dark:text-gray-400',
          onRemove: onClearKategorieFilter,
        });
      } else if (kategorieFilter.type === 'kategorie') {
        const kategorie = kategorien.find((k) => k.id === kategorieFilter.kategorieId);
        filters.push({
          type: 'kategorie',
          label: kategorie?.name ?? 'Unbekannt',
          kategorieColor: kategorie?.farbe,
          onRemove: onClearKategorieFilter,
        });
      }
    }

    // Status-Filter Chip
    if (statusFilter && statusFilter.type !== 'all' && onClearStatusFilter) {
      const statusLabels: Record<ErinnerungStatus, string> = {
        GEPLANT: 'Geplant',
        AUSGELOEST: 'Ausgelöst',
        ACKNOWLEDGED: 'Bestätigt',
        SNOOZED: 'Verschoben',
        ESKALIERT: 'Eskaliert',
        ERLEDIGT: 'Erledigt',
      };
      filters.push({
        type: 'status',
        label: statusLabels[statusFilter.status],
        colorClass: STATUS_COLORS[statusFilter.status],
        onRemove: onClearStatusFilter,
      });
    }

    return filters;
  }, [teamFilter, kategorieFilter, statusFilter, kategorien, teilnehmer, onClearTeamFilter, onClearKategorieFilter, onClearStatusFilter]);

  // Nicht rendern wenn keine Filter aktiv
  if (activeFilters.length === 0) {
    return null;
  }

  const showClearAll = activeFilters.length >= 2 && onClearAll;

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {activeFilters.map((filter) => (
        <FilterChip key={`${filter.type}-${filter.label}`} label={filter.label} colorClass={filter.colorClass} kategorieColor={filter.kategorieColor} onRemove={filter.onRemove} />
      ))}

      {showClearAll && (
        <button
          type="button"
          onClick={onClearAll}
          aria-label="Alle aktiven Filter zurücksetzen"
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-medium text-xs',
            'text-gray-500 hover:bg-gray-100 hover:text-gray-700',
            'transition-colors duration-150',
            'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
            'dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200',
          )}
        >
          <PiX className="h-3 w-3" />
          Alle löschen
        </button>
      )}
    </div>
  );
}
