import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useCreateEinsatz } from '../../../hooks/einsatz/useEinsatzQueries';
import CreateInitialEinsatz from './CreateInitialEinsatz';

// Mock der Hooks
vi.mock('../../../hooks/einsatz/useEinsatzQueries', () => ({
    useCreateEinsatz: vi.fn(),
    useEinsatzOperations: vi.fn(() => ({
        hasEinsatz: vi.fn(() => false),
        hasDataBeenFetched: true,
    })),
}));

// Mock für useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router', () => ({
    ...vi.importActual('react-router'),
    useNavigate: () => mockNavigate,
}));

// Mock für Ant Design message
vi.mock('antd', async () => {
    const antd = await vi.importActual('antd');
    return {
        ...antd,
        message: {
            success: vi.fn(),
            error: vi.fn(),
        },
    };
});

describe('CreateInitialEinsatz', () => {
    // Mock-Objekte für die Tests
    const mockMutateAsync = vi.fn();
    const mockCreateEinsatz = {
        mutateAsync: mockMutateAsync,
        isPending: false,
        error: null,
    };

    // Test-Utilities
    const createQueryClient = () => new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

    const renderComponent = (queryClient = createQueryClient()) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <CreateInitialEinsatz />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (useCreateEinsatz as unknown as ReturnType<typeof vi.fn>).mockReturnValue(mockCreateEinsatz);
    });

    // Unit Tests
    describe('Component Rendering', () => {
        it('sollte alle UI-Elemente korrekt rendern', () => {
            renderComponent();

            // Hauptelemente prüfen
            expect(screen.getByText('Initialen Einsatz erstellen')).toBeInTheDocument();
            expect(screen.getByText('Dev-Modus')).toBeInTheDocument();
            expect(screen.getByText('Dieser Schritt ist nur im Development-Modus sichtbar')).toBeInTheDocument();

            // Formular-Felder prüfen
            expect(screen.getByLabelText('Einsatz Name')).toBeInTheDocument();
            expect(screen.getByLabelText('Beschreibung (optional)')).toBeInTheDocument();

            // Submit-Button prüfen
            expect(screen.getByRole('button', { name: /einsatz erstellen/i })).toBeInTheDocument();
        });

        it('sollte Platzhalter-Texte korrekt anzeigen', () => {
            renderComponent();

            const nameInput = screen.getByPlaceholderText('z.B. Brandeinsatz Hauptstraße');
            const beschreibungInput = screen.getByPlaceholderText('Zusätzliche Details zum Einsatz...');

            expect(nameInput).toBeInTheDocument();
            expect(beschreibungInput).toBeInTheDocument();
        });

        it('sollte die Zeichen-Zählung für die Beschreibung anzeigen', () => {
            renderComponent();

            const beschreibungTextarea = screen.getByRole('textbox', { name: /beschreibung/i });
            expect(beschreibungTextarea).toHaveAttribute('maxlength', '500');
        });
    });

    // End-to-End-Flows
    describe('End-to-End Flows', () => {
        it('sollte den vollständigen Erstellungsflow erfolgreich durchlaufen', async () => {
            const user = userEvent.setup();
            const mockNewEinsatz = { id: '123', name: 'Test Einsatz' };
            mockMutateAsync.mockResolvedValue(mockNewEinsatz);

            renderComponent();

            // Formular ausfüllen
            await user.type(screen.getByLabelText('Einsatz Name'), 'Brandeinsatz Hauptstraße');
            await user.type(screen.getByLabelText('Beschreibung (optional)'), 'Großbrand in Mehrfamilienhaus');

            // Formular absenden
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Prüfen, ob die API-Funktion korrekt aufgerufen wurde
            await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalledWith({
                    name: 'Brandeinsatz Hauptstraße',
                    beschreibung: 'Großbrand in Mehrfamilienhaus',
                });
            });

            // Prüfen, ob zur Einsätze-Übersicht navigiert wird
            await waitFor(() => {
                expect(mockNavigate).toHaveBeenCalledWith('/app/einsaetze');
            });
        });

        it('sollte den Erstellungsflow ohne Beschreibung erfolgreich durchlaufen', async () => {
            const user = userEvent.setup();
            const mockNewEinsatz = { id: '123', name: 'Test Einsatz' };
            mockMutateAsync.mockResolvedValue(mockNewEinsatz);

            renderComponent();

            // Nur den Namen ausfüllen
            await user.type(screen.getByLabelText('Einsatz Name'), 'Einsatz ohne Beschreibung');

            // Formular absenden
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Prüfen, ob die API-Funktion korrekt aufgerufen wurde (ohne beschreibung)
            await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalledWith({
                    name: 'Einsatz ohne Beschreibung',
                    beschreibung: undefined,
                });
            });
        });

        it('sollte Fehlbehandlung korrekt durchführen', async () => {
            const user = userEvent.setup();
            const errorMessage = 'Netzwerkfehler beim Erstellen';
            mockMutateAsync.mockRejectedValue(new Error(errorMessage));

            renderComponent();

            // Formular ausfüllen
            await user.type(screen.getByLabelText('Einsatz Name'), 'Test Einsatz');

            // Formular absenden
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Prüfen, ob Fehlermeldung angezeigt wird
            await waitFor(() => {
                expect(screen.getByText(errorMessage)).toBeInTheDocument();
            });

            // Navigation sollte nicht stattfinden
            expect(mockNavigate).not.toHaveBeenCalled();
        });
    });

    // Integrationstests
    describe('Form Integration', () => {
        it('sollte Validierungsfehler für leeren Namen anzeigen', async () => {
            const user = userEvent.setup();
            renderComponent();

            // Formular ohne Name absenden
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Prüfen, ob Validierungsfehler angezeigt wird
            await waitFor(() => {
                expect(screen.getByText('Bitte geben Sie einen Namen für den Einsatz ein')).toBeInTheDocument();
            });

            // API sollte nicht aufgerufen werden
            expect(mockMutateAsync).not.toHaveBeenCalled();
        });

        it('sollte Validierungsfehler für zu kurzen Namen anzeigen', async () => {
            const user = userEvent.setup();
            renderComponent();

            // Sehr kurzen Namen eingeben
            await user.type(screen.getByLabelText('Einsatz Name'), 'A');
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Prüfen, ob Validierungsfehler angezeigt wird
            await waitFor(() => {
                expect(screen.getByText('Der Name muss mindestens 2 Zeichen lang sein')).toBeInTheDocument();
            });
        });

        it('sollte Leerzeichen am Anfang und Ende entfernen', async () => {
            const user = userEvent.setup();
            mockMutateAsync.mockResolvedValue({ id: '123', name: 'Test' });

            renderComponent();

            // Text mit Leerzeichen eingeben
            await user.type(screen.getByLabelText('Einsatz Name'), '  Test Einsatz  ');
            await user.type(screen.getByLabelText('Beschreibung (optional)'), '  Test Beschreibung  ');

            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Prüfen, ob Leerzeichen entfernt wurden
            await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalledWith({
                    name: 'Test Einsatz',
                    beschreibung: 'Test Beschreibung',
                });
            });
        });

        it('sollte leere Beschreibung als undefined behandeln', async () => {
            const user = userEvent.setup();
            mockMutateAsync.mockResolvedValue({ id: '123', name: 'Test' });

            renderComponent();

            await user.type(screen.getByLabelText('Einsatz Name'), 'Test Einsatz');
            await user.type(screen.getByLabelText('Beschreibung (optional)'), '   '); // Nur Leerzeichen

            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            await waitFor(() => {
                expect(mockMutateAsync).toHaveBeenCalledWith({
                    name: 'Test Einsatz',
                    beschreibung: undefined,
                });
            });
        });
    });

    // State-Management-Tests
    describe('State Management', () => {
        it('sollte Loading-Zustand korrekt anzeigen', () => {
            (useCreateEinsatz as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                ...mockCreateEinsatz,
                isPending: true,
            });

            renderComponent();

            const submitButton = screen.getByRole('button', { name: /wird erstellt/i });
            expect(submitButton).toBeInTheDocument();
            expect(submitButton).toHaveClass('ant-btn-loading');
        });

        it('sollte Fehlerzustand in der UI anzeigen', async () => {
            const user = userEvent.setup();
            renderComponent();

            // Manuell einen Fehler setzen
            await user.type(screen.getByLabelText('Einsatz Name'), 'Test');
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            // Fehler simulieren
            mockMutateAsync.mockRejectedValue(new Error('Test Fehler'));

            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            await waitFor(() => {
                expect(screen.getByText('Test Fehler')).toBeInTheDocument();
            });
        });

        it('sollte Formular-State nach Fehler beibehalten', async () => {
            const user = userEvent.setup();
            mockMutateAsync.mockRejectedValue(new Error('Fehler'));

            renderComponent();

            const nameInput = screen.getByLabelText('Einsatz Name');
            await user.type(nameInput, 'Test Einsatz');
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            await waitFor(() => {
                expect(screen.getByText('Fehler', { selector: '.ant-alert-error .ant-alert-description' })).toBeInTheDocument();
            });

            // Formular-Werte sollten erhalten bleiben
            expect(nameInput).toHaveValue('Test Einsatz');
        });
    });

    // Snapshot-Tests
    describe('Snapshots', () => {
        it('sollte einen Snapshot im Standard-Zustand erstellen', () => {
            const { container } = renderComponent();
            expect(container).toMatchSnapshot();
        });

        it('sollte einen Snapshot im Loading-Zustand erstellen', () => {
            (useCreateEinsatz as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
                ...mockCreateEinsatz,
                isPending: true,
            });

            const { container } = renderComponent();
            expect(container).toMatchSnapshot();
        });

        it('sollte einen Snapshot mit Fehlermeldung erstellen', async () => {
            const user = userEvent.setup();
            renderComponent();

            // Fehler provozieren
            await user.type(screen.getByLabelText('Einsatz Name'), 'Test');
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            mockMutateAsync.mockRejectedValue(new Error('Test Fehler'));
            await user.click(screen.getByRole('button', { name: /einsatz erstellen/i }));

            await waitFor(() => {
                expect(screen.getByText('Test Fehler')).toBeInTheDocument();
            });

            const { container } = renderComponent();
            expect(container).toMatchSnapshot();
        });
    });

    // Accessibility Tests
    describe('Accessibility', () => {
        it('sollte korrekte ARIA-Labels haben', () => {
            renderComponent();

            expect(screen.getByRole('textbox', { name: /einsatz name/i })).toBeInTheDocument();
            expect(screen.getByRole('textbox', { name: /beschreibung/i })).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /einsatz erstellen/i })).toBeInTheDocument();
        });

        it('sollte required-Attribute korrekt setzen', () => {
            renderComponent();

            const nameInput = screen.getByLabelText('Einsatz Name');
            const beschreibungInput = screen.getByLabelText('Beschreibung (optional)');

            expect(nameInput).toBeRequired();
            expect(beschreibungInput).not.toBeRequired();
        });
    });
}); 