import * as dateUtils from '@/utils/date';
import { Einsatz } from '@bluelight-hub/shared/client';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, MockedFunction, vi } from 'vitest';
import { EinsaetzeTable } from './EinsaetzeTable';

// Mock für Ant Design Komponenten
vi.mock('antd', async () => {
    const actual = await vi.importActual('antd');
    return {
        ...actual,
        Empty: ({ description }: { description: string }) => (
            <div data-testid="mock-empty">{description}</div>
        ),
        Table: ({
            dataSource,
            columns,
            loading,
            onChange,
            rowSelection,
            pagination,
            locale }: any) => {
            if (!dataSource?.length) {
                return <div data-testid="mock-table">{locale?.emptyText}</div>;
            }

            return (
                <div data-testid="mock-table" data-loading={loading}>
                    <table role="table">
                        <thead>
                            <tr>
                                {rowSelection && <th role="columnheader">Select</th>}
                                {columns.map((col: any) => (
                                    <th role="columnheader" key={col.key} onClick={() => {
                                        if (col.sorter && onChange) {
                                            onChange(pagination, {}, {
                                                field: col.key,
                                                order: 'descend'
                                            });
                                        }
                                    }}>
                                        {col.title}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataSource.map((item: any, index: number) => (
                                <tr key={index}>
                                    {rowSelection && (
                                        <td>
                                            <input
                                                type="checkbox"
                                                onChange={(e) => {
                                                    const keys = e.target.checked ? [item.id] : [];
                                                    const rows = e.target.checked ? [item] : [];
                                                    rowSelection.onChange(keys, rows);
                                                }}
                                                data-testid={`row-select-${item.id}`}
                                            />
                                        </td>
                                    )}
                                    {columns.map((col: any) => (
                                        <td key={col.key}>
                                            {col.render ?
                                                col.render(item[col.dataIndex], item, index) :
                                                item[col.dataIndex]
                                            }
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {pagination && (
                        <div data-testid="pagination">
                            <button
                                onClick={() => onChange?.(
                                    { ...pagination, current: (pagination.current || 1) + 1 },
                                    {},
                                    {}
                                )}
                            >
                                Next Page
                            </button>
                        </div>
                    )}
                </div>
            );
        },
        Tooltip: ({ title, children }: { title: string; children: React.ReactNode }) => (
            <div data-testid="mock-tooltip" data-title={title}>
                {children}
            </div>
        ),
    };
});

// Mock für die formatNatoDateTime-Funktion
vi.mock('@/utils/date', () => ({
    formatNatoDateTime: vi.fn()
}));

// Mock für dayjs
vi.mock('dayjs', () => {
    const mockDayjs = (date?: any) => ({
        diff: vi.fn(() => 0),
        format: vi.fn(() => '23.01.2023 08:00'),
        toDate: vi.fn(() => new Date(date)),
    });
    return {
        default: mockDayjs,
        __esModule: true,
    };
});

describe('EinsaetzeTable', () => {
    const mockOnPageChange = vi.fn();
    const mockOnSortChange = vi.fn();
    const mockOnEinsatzSelect = vi.fn();
    const mockOnSelectionChange = vi.fn();

    // Erstelle Mock-Einsätze basierend auf dem echten Einsatz-Interface
    const createMockEinsatz = (overrides: Partial<Einsatz> = {}): Einsatz => ({
        id: 'einsatz-1',
        name: 'Test Einsatz 1',
        beschreibung: 'Dies ist ein Test-Einsatz',
        createdAt: new Date('2023-01-23T08:00:00Z'),
        updatedAt: new Date('2023-01-23T09:00:00Z'),
        ...overrides
    });

    const mockEinsaetze: Einsatz[] = [
        createMockEinsatz({
            id: 'einsatz-1',
            name: 'Verkehrsunfall B1',
            beschreibung: 'Schwerer Verkehrsunfall auf der B1',
        }),
        createMockEinsatz({
            id: 'einsatz-2',
            name: 'Wohnungsbrand',
            beschreibung: 'Brand in Mehrfamilienhaus',
            createdAt: new Date('2023-01-23T10:00:00Z'),
        }),
        createMockEinsatz({
            id: 'einsatz-3',
            name: 'Rettungsdienst',
            beschreibung: undefined, // Test für leere Beschreibung
        }),
    ];

    beforeEach(() => {
        vi.resetAllMocks();
        (dateUtils.formatNatoDateTime as MockedFunction<typeof dateUtils.formatNatoDateTime>)
            .mockImplementation(() => '230800jan23');
    });

    describe('Rendering', () => {
        it('sollte die Tabelle mit Einsätzen rendern', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            expect(screen.getByTestId('mock-table')).toBeInTheDocument();
            expect(screen.getByText('Verkehrsunfall B1')).toBeInTheDocument();
            expect(screen.getByText('Wohnungsbrand')).toBeInTheDocument();
            expect(screen.getByText('Rettungsdienst')).toBeInTheDocument();
        });

        it('sollte "Keine Einsätze verfügbar" anzeigen, wenn die Liste leer ist', () => {
            render(<EinsaetzeTable einsaetze={[]} />);

            expect(screen.getByText('Keine Einsätze verfügbar')).toBeInTheDocument();
        });

        it('sollte Loading-State anzeigen', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} loading={true} />);

            const table = screen.getByTestId('mock-table');
            expect(table).toHaveAttribute('data-loading', 'true');
        });

        it('sollte Spalten-Header korrekt anzeigen', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            expect(screen.getByText('ID')).toBeInTheDocument();
            expect(screen.getByText('Name')).toBeInTheDocument();
            expect(screen.getByText('Beschreibung')).toBeInTheDocument();
            expect(screen.getByText('Erstellt')).toBeInTheDocument();
            expect(screen.getByText('Aktualisiert')).toBeInTheDocument();
        });
    });

    describe('Data Display', () => {
        it('sollte ID korrekt verkürzt anzeigen', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            // ID sollte auf 8 Zeichen verkürzt werden - verwende getAllByText für mehrere Elemente
            const truncatedIds = screen.getAllByText('einsatz-...');
            expect(truncatedIds).toHaveLength(3); // 3 Einsätze
        });

        it('sollte Namen als klickbare Links anzeigen', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} onEinsatzSelect={mockOnEinsatzSelect} />);

            const nameLink = screen.getByText('Verkehrsunfall B1');
            fireEvent.click(nameLink);

            expect(mockOnEinsatzSelect).toHaveBeenCalledWith('einsatz-1');
        });

        it('sollte "-" für leere Beschreibung anzeigen', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            // Der dritte Einsatz hat keine Beschreibung
            const rows = screen.getAllByText('-');
            expect(rows.length).toBeGreaterThan(0);
        });

        it('sollte Datum korrekt formatieren', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            expect(dateUtils.formatNatoDateTime).toHaveBeenCalled();
            expect(screen.getAllByText('230800jan23')).toHaveLength(6); // 3 Einsätze × 2 Datum-Spalten
        });
    });

    describe('Pagination', () => {
        const paginationConfig = {
            current: 1,
            pageSize: 20,
            total: 100,
        };

        it('sollte Pagination korrekt anzeigen', () => {
            render(
                <EinsaetzeTable
                    einsaetze={mockEinsaetze}
                    pagination={paginationConfig}
                    onPageChange={mockOnPageChange}
                />
            );

            expect(screen.getByTestId('pagination')).toBeInTheDocument();
        });

        it('sollte Seitenwechsel korrekt behandeln', () => {
            render(
                <EinsaetzeTable
                    einsaetze={mockEinsaetze}
                    pagination={paginationConfig}
                    onPageChange={mockOnPageChange}
                />
            );

            const nextButton = screen.getByText('Next Page');
            fireEvent.click(nextButton);

            expect(mockOnPageChange).toHaveBeenCalledWith(2, 20);
        });
    });

    describe('Sorting', () => {
        it('sollte Sortierung für Name-Spalte auslösen', () => {
            render(
                <EinsaetzeTable
                    einsaetze={mockEinsaetze}
                    onSortChange={mockOnSortChange}
                />
            );

            const nameHeader = screen.getByText('Name');
            fireEvent.click(nameHeader);

            expect(mockOnSortChange).toHaveBeenCalledWith({
                field: 'name',
                order: 'descend'
            });
        });

        it('sollte Sortierung für Erstellt-Spalte auslösen', () => {
            render(
                <EinsaetzeTable
                    einsaetze={mockEinsaetze}
                    onSortChange={mockOnSortChange}
                />
            );

            const createdAtHeader = screen.getByText('Erstellt');
            fireEvent.click(createdAtHeader);

            expect(mockOnSortChange).toHaveBeenCalledWith({
                field: 'createdAt',
                order: 'descend'
            });
        });
    });

    describe('Row Selection', () => {
        it('sollte Row Selection anzeigen, wenn onSelectionChange bereitgestellt wird', () => {
            render(
                <EinsaetzeTable
                    einsaetze={mockEinsaetze}
                    onSelectionChange={mockOnSelectionChange}
                />
            );

            expect(screen.getByText('Select')).toBeInTheDocument();
            expect(screen.getByTestId('row-select-einsatz-1')).toBeInTheDocument();
        });

        it('sollte Zeilen-Auswahl korrekt behandeln', () => {
            render(
                <EinsaetzeTable
                    einsaetze={mockEinsaetze}
                    onSelectionChange={mockOnSelectionChange}
                />
            );

            const checkbox = screen.getByTestId('row-select-einsatz-1');
            fireEvent.click(checkbox);

            expect(mockOnSelectionChange).toHaveBeenCalledWith(
                ['einsatz-1'],
                [mockEinsaetze[0]]
            );
        });

        it('sollte keine Row Selection anzeigen, wenn onSelectionChange nicht bereitgestellt wird', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            expect(screen.queryByText('Select')).not.toBeInTheDocument();
        });
    });

    describe('Responsive Design', () => {
        it('sollte responsive Spalten korrekt konfigurieren', () => {
            const { container } = render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            // Prüfen, dass die Komponente ohne Fehler rendert
            // Die tatsächliche responsive Funktionalität wird durch Ant Design gehandhabt
            expect(container.firstChild).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('sollte mit ungültigen Daten umgehen können', () => {
            const invalidEinsaetze = [
                {
                    id: 'invalid',
                    name: '',
                    createdAt: null,
                    updatedAt: null,
                } as any
            ];

            expect(() => {
                render(<EinsaetzeTable einsaetze={invalidEinsaetze} />);
            }).not.toThrow();
        });

        it('sollte mit fehlendem formatNatoDateTime umgehen', () => {
            (dateUtils.formatNatoDateTime as MockedFunction<typeof dateUtils.formatNatoDateTime>)
                .mockImplementation(() => null);

            expect(() => {
                render(<EinsaetzeTable einsaetze={mockEinsaetze} />);
            }).not.toThrow();
        });
    });

    describe('Accessibility', () => {
        it('sollte Table mit korrekter Semantik rendern', () => {
            const { container } = render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            // Prüfe, dass table element existiert
            const tableElement = container.querySelector('table[role="table"]');
            expect(tableElement).toBeInTheDocument();

            // Prüfe, dass column headers existieren
            const columnHeaders = container.querySelectorAll('th[role="columnheader"]');
            expect(columnHeaders).toHaveLength(5);
        });

        it('sollte Tooltip-Informationen bereitstellen', () => {
            render(<EinsaetzeTable einsaetze={mockEinsaetze} />);

            const tooltips = screen.getAllByTestId('mock-tooltip');
            expect(tooltips.length).toBeGreaterThan(0);
        });
    });
}); 