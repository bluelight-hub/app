import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { EinsaetzeUebersichtPage } from './page';
import type { Einsatz } from '@bluelight-hub/shared/client/models';

// Mock dependencies
vi.mock('../../../../utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Mock NewEinsatzModal component
vi.mock('../../../organisms/einsaetze/NewEinsatzModal', () => ({
    NewEinsatzModal: ({ open, onClose, onSuccess }: any) => {
        if (!open) return null;
        return (
            <div data-testid="new-einsatz-modal">
                <button onClick={onClose} data-testid="modal-close">Close Modal</button>
                <button 
                    onClick={() => {
                        onSuccess?.();
                        onClose();
                    }} 
                    data-testid="modal-success"
                >
                    Success
                </button>
            </div>
        );
    }
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: () => mockNavigate
    };
});

const mockSelectEinsatz = vi.fn();
vi.mock('../../../../contexts/EinsatzContext', () => ({
    useEinsatzContext: () => ({
        selectEinsatz: mockSelectEinsatz,
        selectedEinsatz: null,
        clearSelectedEinsatz: vi.fn(),
        isEinsatzSelected: false
    })
}));

const mockUseEinsaetzeUebersicht = vi.fn();
const mockUpdateSearch = vi.fn();
const mockClearSearch = vi.fn();
const mockUseEinsatzSearch = vi.fn(() => ({
    searchText: '',
    debouncedSearchText: '',
    updateSearch: mockUpdateSearch,
    clearSearch: mockClearSearch
}));

vi.mock('../../../../hooks/einsatz/useEinsaetzeUebersicht', () => ({
    useEinsaetzeUebersicht: () => mockUseEinsaetzeUebersicht(),
    useEinsatzSearch: () => mockUseEinsatzSearch()
}));

// Mock Ant Design components that might cause issues in tests
vi.mock('antd', async () => {
    const actual = await vi.importActual('antd');
    return {
        ...actual,
        Table: ({ dataSource, columns, onRow, loading, pagination, locale }: any) => {
            const handlePageChange = pagination?.onChange;
            
            // Berechne Range für showTotal
            let showTotalText = '';
            if (pagination?.showTotal && dataSource) {
                const current = pagination.current || 1;
                const pageSize = pagination.pageSize || 10;
                const total = pagination.total || dataSource.length;
                const rangeStart = (current - 1) * pageSize + 1;
                const rangeEnd = Math.min(current * pageSize, total);
                showTotalText = pagination.showTotal(total, [rangeStart, rangeEnd]);
            }
            
            return (
                <div>
                    {loading && <div>Loading...</div>}
                    {locale?.emptyText && dataSource?.length === 0 && (
                        <div>{locale.emptyText}</div>
                    )}
                    <table>
                        <thead>
                            <tr>
                                {columns.map((col: any) => (
                                    <th key={col.key}>{col.title}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {dataSource?.map((row: any) => {
                                const rowProps = onRow?.(row) || {};
                                return (
                                    <tr
                                        key={row.id}
                                        onClick={rowProps.onClick}
                                        style={rowProps.style}
                                        data-testid={`row-${row.id}`}
                                    >
                                        {columns.map((col: any) => (
                                            <td key={col.key}>
                                                {col.render
                                                    ? col.render(row[col.dataIndex], row)
                                                    : row[col.dataIndex]}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {pagination && (
                        <div>
                            <button
                                onClick={() => handlePageChange?.(pagination.current - 1)}
                                disabled={pagination.current === 1}
                            >
                                Previous
                            </button>
                            <span>
                                Page {pagination.current} of{' '}
                                {Math.ceil(pagination.total / pagination.pageSize)}
                            </span>
                            <button
                                onClick={() => handlePageChange?.(pagination.current + 1)}
                                disabled={
                                    pagination.current ===
                                    Math.ceil(pagination.total / pagination.pageSize)
                                }
                            >
                                Next
                            </button>
                            {showTotalText && (
                                <div data-testid="pagination-info">{showTotalText}</div>
                            )}
                        </div>
                    )}
                </div>
            );
        }
    };
});

describe('EinsaetzeUebersichtPage', () => {
    const mockEinsaetze: Einsatz[] = [
        {
            id: '1',
            name: 'Test Einsatz 1',
            beschreibung: 'Test Beschreibung 1',
            createdAt: new Date('2024-01-01T10:00:00Z'),
            updatedAt: new Date('2024-01-01T10:00:00Z'),
            userId: 'user1',
            user: {
                id: 'user1',
                email: 'test@example.com',
                username: 'testuser',
                profile: { firstName: 'Test', lastName: 'User' }
            }
        },
        {
            id: '2',
            name: 'Test Einsatz 2',
            beschreibung: '',
            createdAt: new Date('2024-01-02T10:00:00Z'),
            updatedAt: new Date('2024-01-02T10:00:00Z'),
            userId: 'user1',
            user: {
                id: 'user1',
                email: 'test@example.com',
                username: 'testuser',
                profile: { firstName: 'Test', lastName: 'User' }
            }
        }
    ];

    const defaultMockData = {
        einsaetze: mockEinsaetze,
        isLoading: false,
        isError: false,
        error: null,
        totalEinsaetze: 2,
        filteredEinsaetze: 2,
        currentPage: 1,
        pageSize: 20,
        goToPage: vi.fn(),
        updateFilters: vi.fn(),
        clearFilters: vi.fn()
    };

    const queryClient = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false }
        }
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <BrowserRouter>
                    <EinsaetzeUebersichtPage />
                </BrowserRouter>
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        mockNavigate.mockClear();
        mockSelectEinsatz.mockClear();
        mockUpdateSearch.mockClear();
        mockClearSearch.mockClear();
        mockUseEinsatzSearch.mockReturnValue({
            searchText: '',
            debouncedSearchText: '',
            updateSearch: mockUpdateSearch,
            clearSearch: mockClearSearch
        });
        mockUseEinsaetzeUebersicht.mockReturnValue(defaultMockData);
    });

    describe('rendering', () => {
        it('should render page title and header', () => {
            renderComponent();

            expect(screen.getByText('Einsätze-Übersicht')).toBeInTheDocument();
            expect(screen.getByText('Neuer Einsatz')).toBeInTheDocument();
        });

        it('should render search input', () => {
            renderComponent();

            expect(screen.getByPlaceholderText('Einsätze durchsuchen...')).toBeInTheDocument();
        });

        it('should render filter reset button', () => {
            renderComponent();

            expect(screen.getByText('Filter zurücksetzen')).toBeInTheDocument();
        });

        it('should display total einsaetze count', () => {
            renderComponent();

            expect(screen.getByText('2 Einsätze insgesamt')).toBeInTheDocument();
        });

        it('should display filtered count when different from total', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                filteredEinsaetze: 1,
                totalEinsaetze: 2
            });

            renderComponent();

            expect(screen.getByText('Zeige 1 von 2 Einsätzen')).toBeInTheDocument();
        });
    });

    describe('table display', () => {
        it('should render all einsaetze in table', () => {
            renderComponent();

            expect(screen.getByText('Test Einsatz 1')).toBeInTheDocument();
            expect(screen.getByText('Test Einsatz 2')).toBeInTheDocument();
        });

        it('should display beschreibung or dash', () => {
            renderComponent();

            expect(screen.getByText('Test Beschreibung 1')).toBeInTheDocument();
            expect(screen.getByText('-')).toBeInTheDocument();
        });

        it('should show loading state', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                isLoading: true,
                einsaetze: []
            });

            renderComponent();

            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should show empty state with search', () => {
            mockUseEinsatzSearch.mockReturnValue({
                searchText: 'no results',
                debouncedSearchText: 'no results',
                updateSearch: mockUpdateSearch,
                clearSearch: mockClearSearch
            });

            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                einsaetze: []
            });

            renderComponent();

            expect(screen.getByText('Keine Einsätze entsprechen den Suchkriterien')).toBeInTheDocument();
        });

        it('should show empty state without search', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                einsaetze: [],
                totalEinsaetze: 0
            });

            renderComponent();

            expect(screen.getByText('Keine Einsätze vorhanden')).toBeInTheDocument();
        });
    });

    describe('error handling', () => {
        it('should display error alert when error occurs', () => {
            const mockError = new Error('Failed to load');
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                isError: true,
                error: mockError
            });

            renderComponent();

            expect(screen.getByText('Fehler beim Laden der Einsätze')).toBeInTheDocument();
            expect(screen.getByText('Failed to load')).toBeInTheDocument();
        });
    });

    describe('user interactions', () => {
        it('should handle row click', async () => {
            renderComponent();

            const row = screen.getByTestId('row-1');
            fireEvent.click(row);

            expect(mockSelectEinsatz).toHaveBeenCalledWith(mockEinsaetze[0]);
            expect(mockNavigate).toHaveBeenCalledWith('/app');
        });

        it('should handle search input', async () => {
            renderComponent();

            const searchInput = screen.getByPlaceholderText('Einsätze durchsuchen...');
            await userEvent.type(searchInput, 'test search');

            await waitFor(() => {
                expect(mockUpdateSearch).toHaveBeenCalled();
            });
        });

        it('should handle filter reset', async () => {
            const mockClearFilters = vi.fn();
            
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                clearFilters: mockClearFilters
            });

            renderComponent();

            const resetButton = screen.getByText('Filter zurücksetzen');
            fireEvent.click(resetButton);

            expect(mockClearFilters).toHaveBeenCalled();
            expect(mockClearSearch).toHaveBeenCalled();
        });

        it('should update filters when search changes', async () => {
            const mockUpdateFilters = vi.fn();
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                updateFilters: mockUpdateFilters
            });

            // Mock with debounced search text
            mockUseEinsatzSearch.mockReturnValue({
                searchText: 'test',
                debouncedSearchText: 'test',
                updateSearch: mockUpdateSearch,
                clearSearch: mockClearSearch
            });

            renderComponent();

            await waitFor(() => {
                expect(mockUpdateFilters).toHaveBeenCalledWith({ searchText: 'test' });
            });
        });
    });

    describe('pagination', () => {
        it('should handle page changes', () => {
            const mockGoToPage = vi.fn();
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                goToPage: mockGoToPage,
                totalEinsaetze: 50,
                filteredEinsaetze: 50,
                currentPage: 1,
                pageSize: 20
            });

            renderComponent();

            const nextButton = screen.getByText('Next');
            fireEvent.click(nextButton);

            expect(mockGoToPage).toHaveBeenCalledWith(2);
        });

        it('should disable previous button on first page', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                currentPage: 1,
                totalEinsaetze: 50,
                filteredEinsaetze: 50
            });

            renderComponent();

            const prevButton = screen.getByText('Previous');
            expect(prevButton).toBeDisabled();
        });

        it('should disable next button on last page', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                currentPage: 3,
                totalEinsaetze: 50,
                filteredEinsaetze: 50,
                pageSize: 20
            });

            renderComponent();

            const nextButton = screen.getByText('Next');
            expect(nextButton).toBeDisabled();
        });

        it('should display pagination info with showTotal', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                einsaetze: Array(50).fill(null).map((_, i) => ({
                    ...mockEinsaetze[0],
                    id: `${i + 1}`
                })),
                totalEinsaetze: 50,
                filteredEinsaetze: 50,
                currentPage: 2,
                pageSize: 20
            });

            renderComponent();

            // Test zeigt an: "21-40 von 50 Einsätzen"
            expect(screen.getByTestId('pagination-info')).toHaveTextContent('21-40 von 50 Einsätzen');
        });

        it('should display correct range on first page', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                einsaetze: Array(50).fill(null).map((_, i) => ({
                    ...mockEinsaetze[0],
                    id: `${i + 1}`
                })),
                totalEinsaetze: 50,
                filteredEinsaetze: 50,
                currentPage: 1,
                pageSize: 20
            });

            renderComponent();

            // Test zeigt an: "1-20 von 50 Einsätzen"
            expect(screen.getByTestId('pagination-info')).toHaveTextContent('1-20 von 50 Einsätzen');
        });

        it('should display correct range on last page with partial items', () => {
            mockUseEinsaetzeUebersicht.mockReturnValue({
                ...defaultMockData,
                einsaetze: Array(45).fill(null).map((_, i) => ({
                    ...mockEinsaetze[0],
                    id: `${i + 1}`
                })),
                totalEinsaetze: 45,
                filteredEinsaetze: 45,
                currentPage: 3,
                pageSize: 20
            });

            renderComponent();

            // Test zeigt an: "41-45 von 45 Einsätzen"
            expect(screen.getByTestId('pagination-info')).toHaveTextContent('41-45 von 45 Einsätzen');
        });
    });

    describe('modal interactions', () => {
        it('should open modal when "Neuer Einsatz" button is clicked', async () => {
            renderComponent();

            const newEinsatzButton = screen.getByText('Neuer Einsatz');
            fireEvent.click(newEinsatzButton);

            expect(screen.getByTestId('new-einsatz-modal')).toBeInTheDocument();
        });

        it('should close modal when close handler is called', async () => {
            renderComponent();

            // Open modal
            const newEinsatzButton = screen.getByText('Neuer Einsatz');
            fireEvent.click(newEinsatzButton);

            expect(screen.getByTestId('new-einsatz-modal')).toBeInTheDocument();

            // Close modal
            const closeButton = screen.getByTestId('modal-close');
            fireEvent.click(closeButton);

            expect(screen.queryByTestId('new-einsatz-modal')).not.toBeInTheDocument();
        });

        it('should close modal when success handler is called', async () => {
            renderComponent();

            // Open modal
            const newEinsatzButton = screen.getByText('Neuer Einsatz');
            fireEvent.click(newEinsatzButton);

            expect(screen.getByTestId('new-einsatz-modal')).toBeInTheDocument();

            // Trigger success (this will call onSuccess which should close the modal)
            const successButton = screen.getByTestId('modal-success');
            fireEvent.click(successButton);

            // Wait for the modal to close
            await waitFor(() => {
                expect(screen.queryByTestId('new-einsatz-modal')).not.toBeInTheDocument();
            });
        });

        it('should not show modal initially', () => {
            renderComponent();

            expect(screen.queryByTestId('new-einsatz-modal')).not.toBeInTheDocument();
        });
    });
});