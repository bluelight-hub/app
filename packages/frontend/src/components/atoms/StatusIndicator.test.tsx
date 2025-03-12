import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { StatusIndicator } from './StatusIndicator';

// Mock der fetch-Funktion
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock der Clipboard API
const mockClipboard = {
    writeText: vi.fn()
};
Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true
});

// Mock der Antd message API
vi.mock('antd', async () => {
    const actual = await vi.importActual<typeof import('antd')>('antd');
    return {
        ...actual,
        message: {
            success: vi.fn(),
            error: vi.fn()
        }
    };
});

describe('StatusIndicator', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient({
            defaultOptions: {
                queries: {
                    retry: false
                }
            }
        });
        mockFetch.mockReset();
        mockClipboard.writeText.mockReset();
        vi.mocked(message.success).mockReset();
        vi.mocked(message.error).mockReset();
    });

    const renderComponent = (props = {}) => {
        return render(
            <QueryClientProvider client={queryClient}>
                <StatusIndicator {...props} />
            </QueryClientProvider>
        );
    };

    const getStatusDot = () => {
        const indicator = screen.getByTestId('status-indicator');
        return indicator.querySelector('.ant-badge-status-dot');
    };

    it('zeigt den Ladezustand korrekt an', () => {
        renderComponent();
        expect(getStatusDot()).toHaveClass('ant-badge-status-processing');
    });

    it('zeigt den Erfolgszustand korrekt an', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                status: 'ok',
                details: {
                    database: { status: 'up' }
                }
            })
        });

        renderComponent();
        await waitFor(() => {
            expect(getStatusDot()).toHaveClass('ant-badge-status-success');
        });
    });

    it('zeigt den Fehlerzustand korrekt an', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                status: 'down',
                details: {
                    database: { status: 'down' }
                }
            })
        });

        renderComponent();
        await waitFor(() => {
            expect(getStatusDot()).toHaveClass('ant-badge-status-error');
        });
    });

    it('zeigt den Warnzustand korrekt an', async () => {
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                status: 'degraded',
                details: {
                    database: { status: 'up' },
                    cache: { status: 'down' }
                }
            })
        });

        renderComponent();
        await waitFor(() => {
            expect(getStatusDot()).toHaveClass('ant-badge-status-warning');
        });
    });

    it('ruft den onStatusChange Callback korrekt auf', async () => {
        const onStatusChange = vi.fn();
        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve({
                status: 'ok',
                details: {
                    database: { status: 'up' }
                }
            })
        });

        renderComponent({ onStatusChange });
        await screen.findByTestId('status-indicator');
        await waitFor(() => {
            expect(onStatusChange).toHaveBeenCalledWith(true);
        });
    });

    it('kopiert Debug-Informationen in die Zwischenablage', async () => {
        const mockData = {
            status: 'ok',
            details: {
                database: { status: 'up' }
            }
        };

        mockFetch.mockResolvedValueOnce({
            ok: true,
            json: () => Promise.resolve(mockData)
        });

        renderComponent();
        await screen.findByTestId('status-indicator');

        // Hover über den Status-Indikator um das Popover zu öffnen
        const indicator = screen.getByTestId('status-indicator');
        fireEvent.mouseEnter(indicator.parentElement!);

        // Warte auf den Button im Popover
        const button = await screen.findByRole('button', { name: /Debug-Info kopieren/i });
        await fireEvent.click(button);

        expect(mockClipboard.writeText).toHaveBeenCalledWith(JSON.stringify(mockData, null, 2));
        expect(message.success).toHaveBeenCalledWith('Debug-Informationen in Zwischenablage kopiert');
    });

    it('zeigt eine Fehlermeldung wenn keine Daten verfügbar sind', async () => {
        mockFetch.mockRejectedValueOnce(new Error('Network error'));

        renderComponent();
        await screen.findByTestId('status-indicator');

        // Hover über den Status-Indikator um das Popover zu öffnen
        const indicator = screen.getByTestId('status-indicator');
        fireEvent.mouseEnter(indicator.parentElement!);

        // Warte auf den Button im Popover
        const button = await screen.findByRole('button', { name: /Debug-Info kopieren/i });
        await fireEvent.click(button);

        expect(message.error).toHaveBeenCalledWith('Keine Daten zum Kopieren verfügbar');
    });
}); 