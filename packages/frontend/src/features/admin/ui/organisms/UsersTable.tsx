import { Badge } from '@/shared/ui/atoms/badge.atom';
import { IconButton } from '@/shared/ui/atoms/icon-button.atom';
import { DataTable } from '@/shared/ui/organisms/data-table.organism';
import type { ManagedUserResponseDto } from '@/shared';
import { ManagedUserResponseDtoRoleEnum } from '@/shared';
import type { ColumnDef } from '@tanstack/react-table';
import { useMemo } from 'react';
import { PiArrowSquareOut, PiLockKey, PiLockKeyOpen, PiPencilSimple, PiTrash, PiUsers } from 'react-icons/pi';
import { Link } from '@tanstack/react-router';

interface UsersTableProps {
  users: Array<ManagedUserResponseDto> | undefined;
  isLoading: boolean;
  onDelete: (user: ManagedUserResponseDto) => void;
  onEdit: (user: ManagedUserResponseDto) => void;
  onUnlock: (user: ManagedUserResponseDto) => void;
  operativeRoleFilter: string;
  onOperativeRoleFilterChange: (value: string) => void;
  showOnlyWithoutStammperson: boolean;
  onShowOnlyWithoutStammpersonChange: (value: boolean) => void;
}

const getRoleBadgeVariant = (role: ManagedUserResponseDtoRoleEnum): 'error' | 'warning' | 'info' | 'default' => {
  switch (role) {
    case ManagedUserResponseDtoRoleEnum.SuperAdmin:
      return 'error';
    case ManagedUserResponseDtoRoleEnum.Admin:
      return 'warning';
    case ManagedUserResponseDtoRoleEnum.User:
      return 'info';
    default:
      return 'default';
  }
};

const getOperativeRoleBadgeVariant = (role: string): 'warning' | 'info' | 'default' => {
  switch (role) {
    case 'FUEHRUNGSKRAFT':
      return 'warning';
    case 'EINSATZKRAFT':
      return 'info';
    default:
      return 'default';
  }
};

const getOperativeRoleLabel = (role: string): string => {
  switch (role) {
    case 'FUEHRUNGSKRAFT':
      return 'Führungskraft';
    case 'EINSATZKRAFT':
      return 'Einsatzkraft';
    default:
      return 'Externe';
  }
};

export const UsersTable = ({
  users,
  isLoading,
  onDelete,
  onEdit,
  onUnlock,
  operativeRoleFilter,
  onOperativeRoleFilterChange,
  showOnlyWithoutStammperson,
  onShowOnlyWithoutStammpersonChange,
}: UsersTableProps) => {
  const filteredUsers = useMemo(() => {
    let result = users || [];
    if (operativeRoleFilter) {
      result = result.filter((u) => u.operativeRole === operativeRoleFilter);
    }
    if (showOnlyWithoutStammperson) {
      result = result.filter((u) => {
        const requiresStammperson = u.operativeRole === 'FUEHRUNGSKRAFT' || u.operativeRole === 'EINSATZKRAFT';
        return requiresStammperson && !u.stammperson;
      });
    }
    return result;
  }, [users, operativeRoleFilter, showOnlyWithoutStammperson]);

  const columns: ColumnDef<ManagedUserResponseDto, any>[] = useMemo(
    () => [
      { accessorKey: 'username', header: 'Benutzername' },
      {
        accessorKey: 'role',
        header: 'Rolle',
        cell: ({ row }) => <Badge variant={getRoleBadgeVariant(row.original.role)}>{row.original.role}</Badge>,
      },
      {
        accessorKey: 'operativeRole',
        header: 'Operative Rolle',
        cell: ({ row }) => <Badge variant={getOperativeRoleBadgeVariant(row.original.operativeRole)}>{getOperativeRoleLabel(row.original.operativeRole)}</Badge>,
      },
      {
        id: 'stammperson',
        header: 'Stammperson',
        cell: ({ row }) => {
          const sp = row.original.stammperson;
          if (sp) {
            return (
              <Link to="/admin/stammdaten/personen" className="flex items-center gap-1 text-sm text-action-primary hover:underline">
                {sp.nachname}, {sp.vorname} ({sp.personalnummer})
                <PiArrowSquareOut className="h-3 w-3" />
              </Link>
            );
          }
          const requiresStammperson = row.original.operativeRole === 'FUEHRUNGSKRAFT' || row.original.operativeRole === 'EINSATZKRAFT';
          if (requiresStammperson) {
            return <span className="text-sm text-red-500 italic">⚠ Keine Stammperson</span>;
          }
          return <span className="text-text-muted">—</span>;
        },
      },
      {
        accessorKey: 'isLocked',
        header: 'Status',
        cell: ({ row }) => {
          if (row.original.isLocked) {
            const lockReason = row.original.lockReason;
            return (
              <div className="flex items-center gap-2">
                <Badge variant="warning" className="flex items-center gap-1">
                  <PiLockKey className="h-3 w-3" /> Gesperrt
                </Badge>
                {lockReason && (
                  <span className="text-xs text-text-muted" title={lockReason}>
                    ({lockReason.length > 20 ? `${lockReason.substring(0, 20)}...` : lockReason})
                  </span>
                )}
              </div>
            );
          }
          return <Badge variant="success">Aktiv</Badge>;
        },
      },
      {
        id: 'actions',
        header: 'Aktionen',
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            {row.original.isLocked && (
              <IconButton size="sm" intent="success" appearance="minimal" onClick={() => onUnlock(row.original)} aria-label="Benutzer entsperren">
                <PiLockKeyOpen />
              </IconButton>
            )}
            <IconButton size="sm" appearance="minimal" onClick={() => onEdit(row.original)} aria-label="Benutzer bearbeiten">
              <PiPencilSimple />
            </IconButton>
            <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => onDelete(row.original)} aria-label="Benutzer löschen">
              <PiTrash />
            </IconButton>
          </div>
        ),
      },
    ],
    [onDelete, onEdit, onUnlock],
  );

  const filterToolbar = (
    <div className="flex items-center gap-4">
      <div className="flex flex-col gap-1">
        <label htmlFor="operative-role-filter" className="text-xs font-medium text-text-muted uppercase">
          Operative Rolle
        </label>
        <select
          id="operative-role-filter"
          value={operativeRoleFilter}
          onChange={(e) => onOperativeRoleFilterChange(e.target.value)}
          className="rounded-md border border-gray-300 bg-transparent px-3 py-1.5 text-sm dark:border-gray-600"
        >
          <option value="">Alle Rollen</option>
          <option value="FUEHRUNGSKRAFT">Führungskraft</option>
          <option value="EINSATZKRAFT">Einsatzkraft</option>
          <option value="EXTERNE">Externe</option>
        </select>
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
        <input type="checkbox" checked={showOnlyWithoutStammperson} onChange={(e) => onShowOnlyWithoutStammpersonChange(e.target.checked)} className="h-4 w-4 rounded border-gray-300" />
        Nur ohne Stammperson
      </label>
    </div>
  );

  return (
    <DataTable
      columns={columns}
      data={filteredUsers}
      getRowId={(row) => row.id}
      isLoading={isLoading}
      searchable={{ placeholder: 'Benutzer suchen...' }}
      emptyState={{
        icon: PiUsers,
        title: 'Keine Benutzer',
        description: 'Es wurden noch keine Benutzer angelegt.',
      }}
      toolbar={filterToolbar}
    />
  );
};
