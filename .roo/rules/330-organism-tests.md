---
description: ENFORCE spezifische Teststandards für Organism-Komponenten
globs: packages/frontend/src/components/organisms/**/*.test.tsx
alwaysApply: false
---
# Organism Component Tests

## Context
- Gilt für alle Organism-Komponenten im Frontend
- Organismen sind komplexe UI-Komponenten, die aus mehreren Molekülen und/oder Atomen bestehen
- Folgt den Grundsätzen aus der 300-atomic-design-tests.md

## Requirements

1. **Testdateinamenskonvention**
   - Namensschema: `KomponentenName.test.tsx`
   - Platzierung im gleichen Verzeichnis wie die Komponente (`components/organisms/`)

2. **Testart und -umfang**
   - **Unit Tests** (mindestens 4-5):
     - Überprüfe das korrekte Rendering der gesamten Komponente
     - Teste alle enthaltenen Molecule- und Atom-Komponenten
     - Überprüfe konditionales Rendering basierend auf Props
     - Teste State-Management innerhalb der Komponente
     - Validiere CSS-Klassen und Layout-Struktur
   
   - **Interaktions-Tests** (mindestens 3):
     - Teste komplexe Benutzerinteraktionen
     - Überprüfe State-Änderungen innerhalb der Komponente
     - Teste Datenfluss zwischen untergeordneten Komponenten
     - Validiere Callbacks und Event-Handling
   
   - **Integration Tests** (mindestens 2-3):
     - Testen im Kontext von Parent-Komponenten
     - Überprüfe die korrekte Interaktion mit anderen Organismen
     - Teste komplexes Zusammenspiel mit Context/Store-Zuständen
   
   - **Snapshot Tests** (mindestens 2):
     - Grundversion mit Standard-Props
     - Varianten mit unterschiedlichen States/Props

3. **Mocking**
   - **Priorität auf Integration**: Versuche möglichst wenig zu mocken
   - **Strategisches Mocking**: Mock komplexe externe Abhängigkeiten (APIs, Stores)
   - **Dokumentation**: Klar dokumentieren, was und warum gemockt wurde

4. **Feature-basiertes Testen**
   - Gruppiere Tests nach Features oder Funktionalitäten
   - Teste jeden Use-Case separat
   - Dokumentiere Edge Cases und Grenzwerte

5. **Test Coverage**
   - Mindestens 85-90% Testabdeckung für Organism-Komponenten anstreben
   - Teste alle Branches in konditionalen Renderinglogiken
   - Teste alle State-Kombinationen

6. **Performance- und Accessibility-Tests**
   - Teste Rendering-Performance, wenn relevant
   - Umfassende Accessibility-Tests (Keyboard, Screen Reader-Kompatibilität)
   - Teste Responsive-Verhalten auf verschiedenen Bildschirmgrößen

## Examples

<example>
// DataTable.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DataTable from './DataTable';
import { TableContext } from '../../context/TableContext';

// Mock-Daten
const mockData = [
  { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin' },
  { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User' },
];

const mockColumns = [
  { key: 'name', header: 'Name' },
  { key: 'email', header: 'Email' },
  { key: 'role', header: 'Role' },
];

// Mock-Funktionen
const mockOnRowClick = vi.fn();
const mockOnSort = vi.fn();
const mockOnPageChange = vi.fn();

describe('DataTable', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  // Unit Tests
  it('should render table with correct headers', () => {
    render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        onRowClick={mockOnRowClick} 
        data-testid="data-table" 
      />
    );
    
    mockColumns.forEach(column => {
      expect(screen.getByText(column.header)).toBeInTheDocument();
    });
  });

  it('should render all data rows correctly', () => {
    render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        onRowClick={mockOnRowClick} 
        data-testid="data-table" 
      />
    );
    
    mockData.forEach(row => {
      expect(screen.getByText(row.name)).toBeInTheDocument();
      expect(screen.getByText(row.email)).toBeInTheDocument();
      expect(screen.getByText(row.role)).toBeInTheDocument();
    });
  });

  it('should apply correct CSS classes to table elements', () => {
    render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        onRowClick={mockOnRowClick} 
        data-testid="data-table" 
      />
    );
    
    const table = screen.getByTestId('data-table');
    expect(table).toHaveClass('data-table');
    
    const headers = screen.getAllByRole('columnheader');
    headers.forEach(header => {
      expect(header).toHaveClass('table-header');
    });
  });

  // Interaktions-Tests
  it('should call onRowClick when a row is clicked', () => {
    render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        onRowClick={mockOnRowClick} 
        data-testid="data-table" 
      />
    );
    
    const firstRow = screen.getByText('John Doe').closest('tr');
    fireEvent.click(firstRow);
    
    expect(mockOnRowClick).toHaveBeenCalledWith(mockData[0]);
  });

  it('should sort data when header is clicked', () => {
    render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        onSort={mockOnSort} 
        data-testid="data-table" 
      />
    );
    
    const nameHeader = screen.getByText('Name');
    fireEvent.click(nameHeader);
    
    expect(mockOnSort).toHaveBeenCalledWith('name', 'asc');
  });

  it('should handle pagination correctly', async () => {
    render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        onPageChange={mockOnPageChange}
        pagination
        itemsPerPage={1}
        data-testid="data-table" 
      />
    );
    
    // Auf der ersten Seite sollte nur John Doe sichtbar sein
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    
    // Zur zweiten Seite navigieren
    const nextButton = screen.getByLabelText('Next page');
    fireEvent.click(nextButton);
    
    await waitFor(() => {
      expect(mockOnPageChange).toHaveBeenCalledWith(2);
    });
  });

  // Integration Tests
  it('should work with TableContext', () => {
    const mockContextValue = {
      selectedRows: [1],
      toggleRowSelection: vi.fn()
    };
    
    render(
      <TableContext.Provider value={mockContextValue}>
        <DataTable 
          data={mockData} 
          columns={mockColumns} 
          selectable
          data-testid="data-table" 
        />
      </TableContext.Provider>
    );
    
    // Die erste Zeile sollte als ausgewählt markiert sein
    const firstRow = screen.getByText('John Doe').closest('tr');
    expect(firstRow).toHaveClass('selected');
    
    // Klick auf Checkbox sollte toggleRowSelection auslösen
    const checkbox = screen.getAllByRole('checkbox')[1]; // First checkbox after header
    fireEvent.click(checkbox);
    
    expect(mockContextValue.toggleRowSelection).toHaveBeenCalledWith(1);
  });

  // Snapshot Tests
  it('should match snapshot with standard props', () => {
    const { container } = render(
      <DataTable 
        data={mockData} 
        columns={mockColumns} 
        data-testid="data-table" 
      />
    );
    expect(container).toMatchSnapshot();
  });

  it('should match snapshot with empty data', () => {
    const { container } = render(
      <DataTable 
        data={[]} 
        columns={mockColumns} 
        data-testid="data-table" 
      />
    );
    expect(container).toMatchSnapshot();
  });
});
</example> 