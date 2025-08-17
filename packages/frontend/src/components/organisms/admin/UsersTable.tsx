import { useMemo, useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { FiTrash2 } from 'react-icons/fi';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';
import type { UserDto } from '@bluelight-hub/shared/client';
import type { SortingState } from '@tanstack/react-table';
import { Badge } from '@/components/atoms/badge.atom';
import { IconButton } from '@/components/atoms/icon-button.atom';
import { Table } from '@/components/molecules/table.molecule';

interface UsersTableProps {
  users: Array<UserDto> | undefined;
  isLoading: boolean;
  onDelete: (user: UserDto) => void;
}

const columnHelper = createColumnHelper<UserDto>();

const getRoleBadgeVariant = (role: UserDtoRoleEnum): 'error' | 'warning' | 'info' | 'default' => {
  switch (role) {
    case UserDtoRoleEnum.SuperAdmin:
      return 'error';
    case UserDtoRoleEnum.Admin:
      return 'warning';
    case UserDtoRoleEnum.User:
      return 'info';
    default:
      return 'default';
  }
};

export const UsersTable = ({ users, isLoading, onDelete }: UsersTableProps) => {
  const [sorting, setSorting] = useState<SortingState>([]);

  const columns = useMemo(
    () => [
      columnHelper.accessor('username', {
        header: 'Benutzername',
        cell: (info) => info.getValue(),
      }),
      columnHelper.accessor('role', {
        header: 'Rolle',
        cell: ({ row }) => <Badge variant={getRoleBadgeVariant(row.original.role)}>{row.original.role}</Badge>,
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <IconButton
              size="sm"
              variant="ghost"
              onClick={() => onDelete(row.original)}
              aria-label="Benutzer löschen"
              className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20 dark:hover:text-red-300"
            >
              <FiTrash2 />
            </IconButton>
          </div>
        ),
      }),
    ],
    [onDelete],
  );

  const table = useReactTable({
    data: users || [],
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (isLoading) {
    return (
      <Table.Root>
        <Table.Header>
          <Table.Row>
            <Table.Head>Benutzername</Table.Head>
            <Table.Head>Rolle</Table.Head>
            <Table.Head>ID</Table.Head>
            <Table.Head>Aktionen</Table.Head>
          </Table.Row>
        </Table.Header>
        <Table.Skeleton rows={5} columns={4} />
      </Table.Root>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.Head key={header.id} onClick={header.column.getToggleSortingHandler()} sortable={header.column.getCanSort()} sorted={header.column.getIsSorted()}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
              </Table.Head>
            ))}
          </Table.Row>
        ))}
      </Table.Header>
      <Table.Body>
        {table.getRowModel().rows.map((row) => (
          <Table.Row key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <Table.Cell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</Table.Cell>
            ))}
          </Table.Row>
        ))}
      </Table.Body>
    </Table.Root>
  );
};
