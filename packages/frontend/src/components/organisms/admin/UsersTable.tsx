import { Badge } from '@/components/atoms/badge.atom';
import { IconButton } from '@/components/atoms/icon-button.atom';
import { Table } from '@/components/molecules/table.molecule';
import type { UserDto } from '@bluelight-hub/shared/client';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';
import type { SortingState } from '@tanstack/react-table';
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import { PiPencilSimple, PiTrash } from 'react-icons/pi';

interface UsersTableProps {
  users: Array<UserDto> | undefined;
  isLoading: boolean;
  onDelete: (user: UserDto) => void;
  onEdit: (user: UserDto) => void;
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

export const UsersTable = ({ users, isLoading, onDelete, onEdit }: UsersTableProps) => {
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
        cell: (info) => <span className="font-mono text-gray-600 text-sm dark:text-gray-400">{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <IconButton size="sm" appearance="minimal" onClick={() => onEdit(row.original)} aria-label="Benutzer bearbeiten">
              <PiPencilSimple />
            </IconButton>
            <IconButton size="sm" intent="danger" appearance="minimal" onClick={() => onDelete(row.original)} aria-label="Benutzer löschen">
              <PiTrash />
            </IconButton>
          </div>
        ),
      }),
    ],
    [onDelete, onEdit],
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
