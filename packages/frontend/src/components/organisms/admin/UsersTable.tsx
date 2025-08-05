import { useMemo, useState } from 'react';
import { createColumnHelper, flexRender, getCoreRowModel, getSortedRowModel, useReactTable } from '@tanstack/react-table';
import { Badge, HStack, IconButton, Skeleton, Table } from '@chakra-ui/react';
import { FiTrash2 } from 'react-icons/fi';
import { UserDtoRoleEnum } from '@bluelight-hub/shared/client';
import type { UserDto } from '@bluelight-hub/shared/client';
import type { SortingState } from '@tanstack/react-table';

interface UsersTableProps {
  users: Array<UserDto> | undefined;
  isLoading: boolean;
  onDelete: (user: UserDto) => void;
}

const columnHelper = createColumnHelper<UserDto>();

const getRoleBadgeColor = (role: UserDtoRoleEnum): string => {
  switch (role) {
    case UserDtoRoleEnum.SuperAdmin:
      return 'red';
    case UserDtoRoleEnum.Admin:
      return 'orange';
    case UserDtoRoleEnum.User:
      return 'blue';
    default:
      return 'gray';
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
        cell: ({ row }) => <Badge colorPalette={getRoleBadgeColor(row.original.role)}>{row.original.role}</Badge>,
      }),
      columnHelper.accessor('id', {
        header: 'ID',
        cell: (info) => <span style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{info.getValue()}</span>,
      }),
      columnHelper.display({
        id: 'actions',
        header: 'Aktionen',
        cell: ({ row }) => (
          <HStack>
            <IconButton size="sm" variant="ghost" colorPalette="red" onClick={() => onDelete(row.original)} aria-label="Benutzer löschen">
              <FiTrash2 />
            </IconButton>
          </HStack>
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
            <Table.ColumnHeader>Benutzername</Table.ColumnHeader>
            <Table.ColumnHeader>Rolle</Table.ColumnHeader>
            <Table.ColumnHeader>ID</Table.ColumnHeader>
            <Table.ColumnHeader>Aktionen</Table.ColumnHeader>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {[...Array(5)].map((_, index) => (
            <Table.Row key={index}>
              <Table.Cell>
                <Skeleton height="20px" />
              </Table.Cell>
              <Table.Cell>
                <Skeleton height="20px" width="80px" />
              </Table.Cell>
              <Table.Cell>
                <Skeleton height="20px" width="120px" />
              </Table.Cell>
              <Table.Cell>
                <Skeleton height="20px" width="40px" />
              </Table.Cell>
            </Table.Row>
          ))}
        </Table.Body>
      </Table.Root>
    );
  }

  return (
    <Table.Root>
      <Table.Header>
        {table.getHeaderGroups().map((headerGroup) => (
          <Table.Row key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <Table.ColumnHeader key={header.id} onClick={header.column.getToggleSortingHandler()} style={{ cursor: header.column.getCanSort() ? 'pointer' : 'default' }}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                {header.column.getIsSorted() && <span>{header.column.getIsSorted() === 'asc' ? ' ↑' : ' ↓'}</span>}
              </Table.ColumnHeader>
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
