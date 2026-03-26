import { cn } from '@/shared/ui/cn';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import type { EintragDto, EintragDtoKategorieEnum } from '@/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { format, isValid } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemo } from 'react';
import { PiCaretDown, PiCaretRight, PiPencil, PiPencilLine, PiTrash, PiTrashSimple } from 'react-icons/pi';
import { EtbKategorieBadge } from '../ui/organisms/components/EtbKategorieBadge';
import { EtbVersionBadge } from '../ui/organisms/components/EtbVersionBadge';
import { EtbTextCell } from '../ui/organisms/components/EtbTextCell';

interface UseEtbColumnsProps {
  onEditEntry?: (entry: EintragDto) => void;
  onDeleteEntry?: (entry: EintragDto) => void;
  onShowHistory?: (entry: EintragDto) => void;
  /** Einsatz-ID fuer Befehl-Verlinkung in EtbTextCell */
  einsatzId?: string;
}

export function useEtbColumns({ onEditEntry, onDeleteEntry, onShowHistory, einsatzId }: UseEtbColumnsProps): ColumnDef<EintragDto>[] {
  return useMemo<ColumnDef<EintragDto>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <IconButton aria-label="Eintrag erweitern" onClick={row.getToggleExpandedHandler()} className={cn('rounded p-1 hover:bg-action-secondary', 'text-text-muted hover:text-text-secondary')}>
            {row.getIsExpanded() ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
          </IconButton>
        ),
        size: 48,
      },
      {
        id: 'sequenceNumber',
        accessorKey: 'sequenceNumber',
        header: '#',
        cell: ({ getValue, row }) => {
          const isOutdated = !!row.original.deletedAt || !!row.original.isKorrigiert;
          return <span className={cn('font-mono text-xs text-text-muted', isOutdated && 'line-through opacity-50')}>#{getValue<number>()}</span>;
        },
        size: 70,
        enableSorting: true,
      },
      {
        id: 'version',
        accessorKey: 'version',
        header: 'Ver.',
        cell: ({ getValue, row }) => {
          const rawVersion = getValue<number>();
          const version = typeof rawVersion === 'number' && Number.isFinite(rawVersion) ? rawVersion : null;
          const entry = row.original;

          const hasBeenUpdated = entry.updatedAt && entry.createdAt && entry.updatedAt.valueOf() !== entry.createdAt.valueOf();
          const fallbackVersion = hasBeenUpdated ? 2 : 1;
          const displayVersion = version ?? fallbackVersion;

          if (!displayVersion || displayVersion <= 1) return null;

          return <EtbVersionBadge version={displayVersion} variant="subtle" onClick={() => onShowHistory?.(entry)} />;
        },
        size: 70,
      },
      {
        id: 'status',
        header: 'Status',
        cell: ({ row }) => {
          const entry = row.original;

          // "Gelöscht" Badge
          if (entry.deletedAt) {
            return (
              <span
                className="inline-flex items-center gap-1 rounded-full bg-status-danger-surface px-2 py-0.5 text-xs font-medium text-status-danger-text"
                title={`Gelöscht${entry.deleterUsername ? ` von ${entry.deleterUsername}` : ''}`}
              >
                <PiTrashSimple className="h-3 w-3" />
                Gelöscht
              </span>
            );
          }

          // "Korrigiert" Badge (alte Version, durch Bearbeitung ersetzt) - ausgegraut
          if (entry.isKorrigiert) {
            return (
              <span className="bg-surface-sunken inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium text-text-muted" title="Dieser Eintrag wurde korrigiert.">
                <PiPencilLine className="h-3 w-3" />
                Korrigiert
              </span>
            );
          }

          return null;
        },
        size: 120,
      },
      {
        id: 'timestamp',
        accessorKey: 'timestamp',
        header: 'Zeit',
        cell: ({ getValue }) => {
          const rawTimestamp = getValue<string | Date | null | undefined>();
          const date = rawTimestamp ? new Date(rawTimestamp) : null;

          if (!date || !isValid(date)) {
            return <span className="text-sm text-text-muted">-</span>;
          }

          return (
            <time className="text-sm text-text-secondary" title={format(date, 'dd.MM.yyyy HH:mm:ss', { locale: de })}>
              {format(date, 'HH:mm:ss', { locale: de })}
            </time>
          );
        },
        size: 90,
        enableSorting: true,
      },
      {
        id: 'absender',
        accessorKey: 'absender',
        header: 'Von',
        cell: ({ getValue }) => {
          const absender = getValue<string | null | undefined>();
          if (!absender) {
            return <span className="text-sm text-text-muted">-</span>;
          }
          return (
            <span className="text-sm text-text-secondary" title={absender}>
              {absender}
            </span>
          );
        },
        size: 120,
        enableSorting: true,
      },
      {
        id: 'empfaenger',
        accessorKey: 'empfaenger',
        header: 'An',
        cell: ({ getValue }) => {
          const empfaenger = getValue<string | null | undefined>();
          if (!empfaenger) {
            return <span className="text-sm text-text-muted">-</span>;
          }
          return (
            <span className="text-sm text-text-secondary" title={empfaenger}>
              {empfaenger}
            </span>
          );
        },
        size: 120,
        enableSorting: true,
      },
      {
        id: 'kategorie',
        accessorKey: 'kategorie',
        header: 'Kategorie',
        enableSorting: true,
        cell: ({ getValue }) => <EtbKategorieBadge kategorie={getValue<EintragDtoKategorieEnum>()} />,
        size: 150,
      },
      {
        id: 'text',
        accessorKey: 'text',
        header: 'Eintrag',
        cell: ({ row }) => {
          const entry = row.original;
          const isOutdated = !!entry.deletedAt || !!entry.isKorrigiert;
          return <EtbTextCell entry={entry} isDeleted={isOutdated} einsatzId={einsatzId} />;
        },
        size: 600,
        minSize: 400,
      },
      {
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          const entry = row.original;
          const isDeleted = !!entry.deletedAt;

          // Für gelöschte oder korrigierte Einträge: keine Actions
          if (isDeleted || entry.isKorrigiert) {
            return null;
          }

          // Normal: Bearbeiten + Loeschen Buttons
          return (
            <div className="flex justify-center gap-1">
              {onEditEntry && (
                <IconButton appearance="minimal" size="sm" onClick={() => onEditEntry(entry)} className="text-text-muted hover:text-action-primary" aria-label="Bearbeiten" title="Bearbeiten">
                  <PiPencil />
                </IconButton>
              )}
              {onDeleteEntry && (
                <IconButton appearance="minimal" size="sm" onClick={() => onDeleteEntry(entry)} className="text-text-muted hover:text-status-danger-text" aria-label="Loeschen" title="Loeschen">
                  <PiTrash />
                </IconButton>
              )}
            </div>
          );
        },
        size: 110,
      },
    ],
    [onEditEntry, onDeleteEntry, onShowHistory, einsatzId],
  );
}
