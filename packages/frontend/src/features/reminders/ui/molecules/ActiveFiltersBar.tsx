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
  GEPLANT: 'bg-status-success-surface border-status-success-border text-status-success-text',
  AUSGELOEST: 'bg-status-danger-surface border-status-danger-border text-status-danger-text',
  ACKNOWLEDGED: 'bg-status-info-surface border-status-info-border text-status-info-text',
  SNOOZED: 'bg-status-warning-surface border-status-warning-border text-status-warning-text',
  ESKALIERT: 'bg-status-info-surface border-status-info-border text-status-info-text',
  ERLEDIGT: 'bg-surface-raised border-border-subtle text-text-secondary',
};

const TEAM_FILTER_COLOR = 'bg-status-info-surface border-status-info-border text-status-info-text';

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
          colorClass: 'bg-surface-raised border-border-subtle text-text-secondary',
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
            'text-text-muted hover:bg-action-secondary hover:text-text-primary',
            'transition-colors duration-150',
            'focus:outline-none focus-visible:shadow-focus-ring',
          )}
        >
          <PiX className="h-3 w-3" />
          Alle löschen
        </button>
      )}
    </div>
  );
}
