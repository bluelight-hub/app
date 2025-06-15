import { Einsatz } from '@bluelight-hub/shared/client/models';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EinsatzProvider } from '../../contexts/EinsatzContext';
import EinsatzGuard from './EinsatzGuard';

// Mock der useEinsatzOperations Hook
const mockUseEinsatzOperations = {
    einsaetze: [] as Einsatz[],
    isLoading: false,
    error: null as Error | null,
    isError: false,
    hasDataBeenFetched: false,
    hasEinsatz: vi.fn(),
    createEinsatz: vi.fn(),
    isCreating: false,
    createError: null as Error | null,
    refetch: vi.fn(),
    invalidate: vi.fn()
};

// Mock useEinsatzOperations
vi.mock('../../hooks/einsatz/useEinsatzQueries', () => ({
    useEinsatzOperations: () => mockUseEinsatzOperations
}));

// Mock useEinsatzContext
const mockUseEinsatzContext = {
    selectedEinsatz: null as Einsatz | null,
    selectEinsatz: vi.fn(),
    clearSelectedEinsatz: vi.fn(),
    isEinsatzSelected: false
};

vi.mock('../../contexts/EinsatzContext', () => ({
    EinsatzProvider: ({ children }: { children: React.ReactNode }) => children,
    useEinsatzContext: () => mockUseEinsatzContext
}));

// Mock logger
vi.mock('../../utils/logger', () => ({
    logger: {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn()
    }
}));

// Helper für Rendering mit Router und QueryClient
const renderWithProviders = (initialPath = '/app') => {
    const queryClient = new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <EinsatzProvider>
                <MemoryRouter initialEntries={[initialPath]}>
                    <EinsatzGuard />
                </MemoryRouter>
            </EinsatzProvider>
        </QueryClientProvider>
    );
};

// Mock Outlet content für testing
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        Outlet: () => <div data-testid="protected-content">Protected App Content</div>,
        Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
            <div data-testid="navigate" data-to={to} data-replace={replace}>
                Redirecting to {to}
            </div>
        )
    };
});

describe('EinsatzGuard', () => {
    const originalEnv = process.env.NODE_ENV;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset mock state
        mockUseEinsatzOperations.einsaetze = [];
        mockUseEinsatzOperations.isLoading = false;
        mockUseEinsatzOperations.error = null;
        mockUseEinsatzOperations.isError = false;
        mockUseEinsatzOperations.hasDataBeenFetched = false;
        mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);

        // Reset EinsatzContext mock
        mockUseEinsatzContext.selectedEinsatz = null;
        mockUseEinsatzContext.isEinsatzSelected = false;

        // Reset environment
        process.env.NODE_ENV = 'development';
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
    });

    describe('Loading States', () => {
        it('should show loading indicator while fetching data', () => {
            mockUseEinsatzOperations.isLoading = true;
            mockUseEinsatzOperations.hasDataBeenFetched = false;

            renderWithProviders();

            expect(screen.getByText('Einsätze werden geladen...')).toBeInTheDocument();
            // Check that protected content is not shown while loading
            expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        });

        it('should show loading indicator when data has not been fetched', () => {
            mockUseEinsatzOperations.isLoading = false;
            mockUseEinsatzOperations.hasDataBeenFetched = false;

            renderWithProviders();

            expect(screen.getByText('Einsätze werden geladen...')).toBeInTheDocument();
        });
    });

    describe('Error Handling', () => {
        it('should handle API errors gracefully and redirect in development', async () => {
            mockUseEinsatzOperations.isError = true;
            mockUseEinsatzOperations.error = new Error('Failed to fetch Einsätze');
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);
            process.env.NODE_ENV = 'development';

            renderWithProviders();

            await waitFor(() => {
                const navigate = screen.getByTestId('navigate');
                expect(navigate).toHaveAttribute('data-to', '/app/create-initial-einsatz');
            });
        });

        it('should handle errors but allow access in production', async () => {
            mockUseEinsatzOperations.isError = true;
            mockUseEinsatzOperations.error = new Error('Network error');
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);
            process.env.NODE_ENV = 'production';

            renderWithProviders();

            await waitFor(() => {
                const navigate = screen.getByTestId('navigate');
                expect(navigate).toHaveAttribute('data-to', '/app/create-initial-einsatz');
            });
        });
    });

    describe('Redirect Logic - Development Environment', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'development';
        });

        it('should redirect to create page when no Einsätze exist in development', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);

            renderWithProviders();

            await waitFor(() => {
                const navigate = screen.getByTestId('navigate');
                expect(navigate).toBeInTheDocument();
                expect(navigate).toHaveAttribute('data-to', '/app/create-initial-einsatz');
                expect(navigate).toHaveAttribute('data-replace', 'true');
            });
        });

        it('should allow access when Einsätze exist and one is selected in development', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(true);
            mockUseEinsatzContext.isEinsatzSelected = true;
            mockUseEinsatzContext.selectedEinsatz = { id: '1', name: 'Test Einsatz' } as Einsatz;

            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeInTheDocument();
                expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
            });
        });

        it('should redirect to einsaetze list when Einsätze exist but none selected', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(true);
            mockUseEinsatzContext.isEinsatzSelected = false;
            mockUseEinsatzContext.selectedEinsatz = null;

            renderWithProviders();

            await waitFor(() => {
                const navigate = screen.getByTestId('navigate');
                expect(navigate).toBeInTheDocument();
                expect(navigate).toHaveAttribute('data-to', '/app/einsaetze');
                expect(navigate).toHaveAttribute('data-replace', 'true');
            });
        });

        it('should not redirect when already on create page', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);
            mockUseEinsatzContext.isEinsatzSelected = false;

            renderWithProviders('/app/create-initial-einsatz');

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeInTheDocument();
                expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
            });
        });

        it('should not redirect when already on einsaetze page', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(true);
            mockUseEinsatzContext.isEinsatzSelected = false;

            renderWithProviders('/app/einsaetze');

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeInTheDocument();
                expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
            });
        });
    });

    describe('Production Environment Behavior', () => {
        beforeEach(() => {
            process.env.NODE_ENV = 'production';
        });

        it('should allow access even when no Einsätze exist in production', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);

            renderWithProviders();

            await waitFor(() => {
                const navigate = screen.getByTestId('navigate');
                expect(navigate).toHaveAttribute('data-to', '/app/create-initial-einsatz');
            });
        });

        it('should allow access when Einsätze exist and one is selected in production', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(true);
            mockUseEinsatzContext.isEinsatzSelected = true;
            mockUseEinsatzContext.selectedEinsatz = { id: '1', name: 'Test Einsatz' } as Einsatz;

            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeInTheDocument();
            });
        });
    });

    describe('Integration Tests', () => {
        it('should complete full flow: load → check → allow access when Einsätze exist and one selected', async () => {
            const mockEinsatz: Einsatz = {
                id: '1',
                name: 'Test Einsatz',
                beschreibung: 'Test description',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.einsaetze = [mockEinsatz];
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(true);
            mockUseEinsatzContext.isEinsatzSelected = true;
            mockUseEinsatzContext.selectedEinsatz = mockEinsatz;

            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeInTheDocument();
            });
        });

        it('should complete full flow: load → check → redirect when no Einsätze in development', async () => {
            process.env.NODE_ENV = 'development';

            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.einsaetze = [];
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(false);

            renderWithProviders();

            await waitFor(() => {
                const navigate = screen.getByTestId('navigate');
                expect(navigate).toHaveAttribute('data-to', '/app/create-initial-einsatz');
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle data not fetched state', () => {
            mockUseEinsatzOperations.hasDataBeenFetched = false;
            mockUseEinsatzOperations.isLoading = false;

            renderWithProviders();

            expect(screen.getByText('Einsätze werden geladen...')).toBeInTheDocument();
        });

        it('should handle normal successful data fetching', async () => {
            mockUseEinsatzOperations.hasDataBeenFetched = true;
            mockUseEinsatzOperations.hasEinsatz.mockReturnValue(true);
            mockUseEinsatzContext.isEinsatzSelected = true;
            mockUseEinsatzContext.selectedEinsatz = { id: '1', name: 'Test Einsatz' } as Einsatz;

            renderWithProviders();

            await waitFor(() => {
                expect(screen.getByTestId('protected-content')).toBeInTheDocument();
            });
        });
    });
}); 