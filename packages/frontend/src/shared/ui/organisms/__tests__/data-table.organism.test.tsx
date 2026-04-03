import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PiMagnifyingGlass, PiTrash, PiUsers } from 'react-icons/pi';
import { describe, expect, it, vi } from 'vitest';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../data-table.organism';

interface TestItem {
  id: string;
  name: string;
  email: string;
}

const testData: TestItem[] = [
  { id: '1', name: 'Alice', email: 'alice@test.de' },
  { id: '2', name: 'Bob', email: 'bob@test.de' },
  { id: '3', name: 'Charlie', email: 'charlie@test.de' },
];

const columns: ColumnDef<TestItem, any>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'email', header: 'E-Mail' },
];

describe('DataTable', () => {
  it('rendert Tabelle mit Daten', () => {
    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} />);

    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('E-Mail')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    expect(screen.getByText('Charlie')).toBeInTheDocument();
  });

  it('zeigt Skeleton bei isLoading', () => {
    render(<DataTable columns={columns} data={[]} getRowId={(row) => row.id} isLoading />);

    // Skeleton rendert animierte Pulse-Elemente
    const pulseElements = document.querySelectorAll('.animate-pulse');
    expect(pulseElements.length).toBeGreaterThan(0);
  });

  it('zeigt Alert bei Fehler', () => {
    const error = new Error('Laden fehlgeschlagen');
    const onRetry = vi.fn();
    render(<DataTable columns={columns} data={[]} getRowId={(row) => row.id} error={error} onRetry={onRetry} />);

    expect(screen.getByText('Laden fehlgeschlagen')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Erneut versuchen' })).toBeInTheDocument();
  });

  it('ruft onRetry auf bei Klick auf Erneut versuchen', async () => {
    const user = userEvent.setup();
    const error = new Error('Fehler');
    const onRetry = vi.fn();
    render(<DataTable columns={columns} data={[]} getRowId={(row) => row.id} error={error} onRetry={onRetry} />);

    await user.click(screen.getByRole('button', { name: 'Erneut versuchen' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('zeigt EmptyState bei leeren Daten', () => {
    render(
      <DataTable
        columns={columns}
        data={[]}
        getRowId={(row) => row.id}
        emptyState={{
          icon: PiUsers,
          title: 'Keine Einträge',
          description: 'Es wurden noch keine Einträge angelegt.',
        }}
      />,
    );

    expect(screen.getByText('Keine Einträge')).toBeInTheDocument();
    expect(screen.getByText('Es wurden noch keine Einträge angelegt.')).toBeInTheDocument();
  });

  it('filtert Daten mit Suche', async () => {
    const user = userEvent.setup();
    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} searchable={{ placeholder: 'Suchen...' }} />);

    const searchInput = screen.getByPlaceholderText('Suchen...');
    await user.type(searchInput, 'Alice');

    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.queryByText('Bob')).not.toBeInTheDocument();
    expect(screen.queryByText('Charlie')).not.toBeInTheDocument();
  });

  it('zeigt Paginierung bei mehr als pageSize Einträgen', () => {
    const manyItems: TestItem[] = Array.from({ length: 15 }, (_, i) => ({
      id: String(i + 1),
      name: `Person ${i + 1}`,
      email: `person${i + 1}@test.de`,
    }));

    render(<DataTable columns={columns} data={manyItems} getRowId={(row) => row.id} pagination={{ defaultPageSize: 10 }} />);

    expect(screen.getByText('Seite 1 von 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Weiter' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zurück' })).toBeInTheDocument();
  });

  it('versteckt Paginierung bei weniger als pageSize Einträgen', () => {
    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} pagination={{ defaultPageSize: 10 }} />);

    expect(screen.queryByText(/Seite \d+ von \d+/)).not.toBeInTheDocument();
  });

  it('zeigt Bulk-Action-Leiste bei Auswahl', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} bulkActions={[{ label: 'Löschen', icon: PiTrash, onClick: onDelete, variant: 'danger' }]} />);

    // Checkboxen sollten vorhanden sein
    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.length).toBe(4); // 1 Header + 3 Zeilen

    // Erste Datenzeile auswählen
    await user.click(checkboxes[1]);

    // Bulk-Action-Leiste wird angezeigt
    expect(screen.getByText('1 ausgewählt')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Löschen' })).toBeInTheDocument();
  });

  it('ruft Bulk-Action mit ausgewählten IDs auf', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} bulkActions={[{ label: 'Löschen', icon: PiTrash, onClick: onDelete }]} />);

    // Alle über Header-Checkbox auswählen
    const checkboxes = screen.getAllByRole('checkbox');
    await user.click(checkboxes[0]);

    await user.click(screen.getByRole('button', { name: 'Löschen' }));
    expect(onDelete).toHaveBeenCalledWith(expect.arrayContaining(['1', '2', '3']));
    expect(onDelete.mock.calls[0][0]).toHaveLength(3);
  });

  it('wählt alle auf aktueller Seite mit Header-Checkbox', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} bulkActions={[{ label: 'Löschen', icon: PiTrash, onClick: onDelete }]} />);

    const checkboxes = screen.getAllByRole('checkbox');
    // Header-Checkbox klicken
    await user.click(checkboxes[0]);

    expect(screen.getByText('3 ausgewählt')).toBeInTheDocument();
  });

  it('rendert ohne Suchfeld wenn searchable=false', () => {
    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} searchable={false} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('rendert benutzerdefinierte Toolbar-Inhalte', () => {
    render(<DataTable columns={columns} data={testData} getRowId={(row) => row.id} toolbar={<button type="button">Neuer Eintrag</button>} />);

    expect(screen.getByRole('button', { name: 'Neuer Eintrag' })).toBeInTheDocument();
  });
});
