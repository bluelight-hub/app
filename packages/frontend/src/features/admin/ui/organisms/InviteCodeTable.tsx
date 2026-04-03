import { DataTable } from '@/shared/ui/organisms/data-table.organism';
import type { InviteCodeListItemDto } from '@/shared';
import { createColumnHelper } from '@tanstack/react-table';
import { useMemo } from 'react';
import { PiEnvelope } from 'react-icons/pi';
import { InviteStatusBadge } from '@/features/admin/ui/atoms/InviteStatusBadge';
import { RevokeInviteButton } from '@/features/admin';

interface InviteCodeTableProps {
  invites: InviteCodeListItemDto[] | undefined;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const columnHelper = createColumnHelper<InviteCodeListItemDto>();

const formatDate = (isoDate: string) => {
  return new Intl.DateTimeFormat('de-DE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(isoDate));
};

/**
 * InviteCodeTable Organism
 *
 * Zeigt eine vollständige Tabelle aller Invite-Codes mit DataTable.
 */
export function InviteCodeTable({ invites, isLoading, error, onRetry }: InviteCodeTableProps) {
  const columns = useMemo(
    () => [
      columnHelper.accessor('code', {
        header: 'Code',
        cell: (info) => <span className="font-mono text-sm">{info.getValue()}</span>,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ row }) => <InviteStatusBadge status={row.original.status as 'active' | 'used' | 'expired' | 'revoked'} />,
      }),
      columnHelper.accessor('label', {
        header: 'Label',
        cell: (info) => {
          const label = info.getValue();
          return label ? <span className="text-sm text-text-primary">{String(label)}</span> : <span className="text-sm text-text-muted">-</span>;
        },
      }),
      columnHelper.accessor('expiresAt', {
        header: 'Ablaufdatum',
        cell: ({ row }) => {
          const isExpired = new Date(row.original.expiresAt) < new Date();
          return (
            <div className="flex flex-col">
              <span className={`text-sm ${isExpired ? 'text-status-danger-text' : 'text-text-primary'}`}>{formatDate(row.original.expiresAt)}</span>
              {isExpired && <span className="text-xs text-status-danger-text">Abgelaufen</span>}
            </div>
          );
        },
      }),
      columnHelper.display({
        id: 'usage',
        header: 'Nutzung',
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.useCount} / {row.original.maxUses}
          </span>
        ),
      }),
      columnHelper.display({
        id: 'creator',
        header: 'Ersteller',
        cell: ({ row }) => <span className="text-sm text-text-primary">{row.original.createdBy.username}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <RevokeInviteButton inviteId={row.original.id} status={row.original.status as 'active' | 'used' | 'expired' | 'revoked'} />
          </div>
        ),
      }),
    ],
    [],
  );

  return (
    <DataTable
      columns={columns}
      data={invites ?? []}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      error={error}
      onRetry={onRetry}
      searchable={{ placeholder: 'Einladungen durchsuchen...' }}
      pagination={{ defaultPageSize: 20, pageSizeOptions: [10, 20, 50] }}
      emptyState={{
        icon: PiEnvelope,
        title: 'Keine Einladungen vorhanden',
        description: 'Es wurden noch keine Invite-Codes erstellt.',
      }}
    />
  );
}
