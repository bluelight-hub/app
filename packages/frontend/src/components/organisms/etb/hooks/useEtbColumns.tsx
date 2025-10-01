import { cn } from '@/utils/cn';
import { IconButton } from '@atoms/icon-button.atom';
import type { EtbEintragDto, EtbEintragDtoKategorieEnum } from '@bluelight-hub/shared/client';
import type { ColumnDef } from '@tanstack/react-table';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useMemo } from 'react';
import { PiCaretDown, PiCaretRight, PiPencil, PiTrash } from 'react-icons/pi';
import { EtbKategorieBadge } from '../components/EtbKategorieBadge';
import { EtbVersionBadge } from '../components/EtbVersionBadge';

interface UseEtbColumnsProps {
  onEditEntry?: (entry: EtbEintragDto) => void;
  handleDelete: (entry: EtbEintragDto) => void;
  onShowHistory?: (entry: EtbEintragDto) => void;
}

export function useEtbColumns({ onEditEntry, handleDelete, onShowHistory }: UseEtbColumnsProps): ColumnDef<EtbEintragDto>[] {
  return useMemo<ColumnDef<EtbEintragDto>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <IconButton
            aria-label="Eintrag erweitern"
            onClick={row.getToggleExpandedHandler()}
            className={cn('rounded p-1 hover:bg-gray-100 dark:hover:bg-gray-700', 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200')}
          >
            {row.getIsExpanded() ? <PiCaretDown className="h-4 w-4" /> : <PiCaretRight className="h-4 w-4" />}
          </IconButton>
        ),
        size: 40,
      },
      {
        id: 'sequenceNumber',
        accessorKey: 'sequenceNumber',
        header: '#',
        cell: ({ getValue }) => <span className="font-mono text-gray-500 text-xs dark:text-gray-400">#{getValue<number>()}</span>,
        size: 60,
        enableSorting: true,
      },
      {
        id: 'version',
        accessorKey: 'version',
        header: 'Ver.',
        cell: ({ getValue, row }) => {
          const version = getValue<number>();
          const entry = row.original;

          if (version <= 1) return null;

          return <EtbVersionBadge version={version} variant="subtle" onClick={() => onShowHistory?.(entry)} />;
        },
        size: 70,
      },
      {
        id: 'timestamp',
        accessorKey: 'timestamp',
        header: 'Zeit',
        cell: ({ getValue }) => {
          const date = new Date(getValue<string>());
          return (
            <time className="text-gray-700 text-sm dark:text-gray-300" title={format(date, 'dd.MM.yyyy HH:mm:ss', { locale: de })}>
              {format(date, 'HH:mm:ss', { locale: de })}
            </time>
          );
        },
        size: 100,
        enableSorting: true,
      },
      {
        id: 'kategorie',
        accessorKey: 'kategorie',
        header: 'Kategorie',
        enableSorting: true,
        cell: ({ getValue }) => <EtbKategorieBadge kategorie={getValue<EtbEintragDtoKategorieEnum>()} />,
        size: 120,
      },
      {
        id: 'text',
        accessorKey: 'text',
        header: 'Eintrag',
        cell: ({ getValue }) => <p className="line-clamp-2 text-gray-900 text-sm dark:text-gray-100">{getValue<string>()}</p>,
      },
      {
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => {
          const entry = row.original;

          // Für gelöschte Einträge keine Actions anzeigen
          if (entry.deletedAt) {
            return (
              <div className="flex justify-center gap-1">
                <span className="text-gray-400 text-xs italic">Gelöscht</span>
              </div>
            );
          }

          return (
            <div className="flex justify-center gap-1">
              <IconButton
                appearance="minimal"
                size="sm"
                onClick={() => onEditEntry?.(entry)}
                className="text-gray-500 hover:text-primary-600 dark:text-gray-400 dark:hover:text-primary-400"
                aria-label="Bearbeiten"
              >
                <PiPencil />
              </IconButton>
              <IconButton size="sm" appearance="minimal" intent="danger" onClick={() => handleDelete(entry)} aria-label="Löschen">
                <PiTrash />
              </IconButton>
            </div>
          );
        },
        size: 100,
      },
    ],
    [onEditEntry, handleDelete, onShowHistory],
  );
}
