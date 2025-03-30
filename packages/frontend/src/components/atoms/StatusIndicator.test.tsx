import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { StatusIndicator } from './StatusIndicator';

// Mock des useBackendHealth Hooks
vi.mock('../../hooks/useBackendHealth', () => {
    return {
        useBackendHealth: () => ({
            isLoading: false,
            getConnectionStatus: () => 'online',
            getSystemDetailsText: () => 'internet: ✅\nfuekw: ✅',
            getDebugInfo: () => JSON.stringify({
                status: 'online',
                details: { internet: { status: 'up' }, fuekw: { status: 'up' } },
                timestamp: '2023-01-01T12:00:00.000Z'
            })
        }),
        // Export des ConnectionStatus-Typs als String-Union
        ConnectionStatus: undefined // Dummy, wird nicht genutzt
    };
});

/**
 * Tests für die StatusIndicator-Komponente
 */
describe('StatusIndicator', () => {
    // Unit Test - Komponente rendert ohne Fehler
    it('sollte ohne Fehler rendern', () => {
        render(<StatusIndicator />);
        const indicator = screen.getByTestId('status-indicator');
        expect(indicator).toBeInTheDocument();
    });

    // Unit Test - Klassen werden korrekt angewendet
    it('sollte benutzerdefinierte Klassen akzeptieren', () => {
        render(<StatusIndicator className="custom-class" />);
        const indicator = screen.getByTestId('status-indicator');
        expect(indicator).toHaveClass('custom-class');
    });

    // Unit Test - Test-ID kann überschrieben werden
    it('sollte eine benutzerdefinierte Test-ID akzeptieren', () => {
        render(<StatusIndicator data-testid="custom-indicator" />);
        const indicator = screen.getByTestId('custom-indicator');
        expect(indicator).toBeInTheDocument();
    });

    // Verhalten bei withText=false (Standard)
    it('sollte standardmäßig keinen Text anzeigen', () => {
        render(<StatusIndicator />);
        expect(screen.queryByText('Vollständig verbunden')).not.toBeInTheDocument();
    });

    // Verhalten bei withText=true
    it('sollte Text anzeigen, wenn withText=true', () => {
        render(<StatusIndicator withText={true} />);
        expect(screen.getByText('Vollständig verbunden')).toBeInTheDocument();
    });

    // onStatusChange Callback
    it('sollte den onStatusChange callback aufrufen', () => {
        const onStatusChange = vi.fn();
        render(<StatusIndicator onStatusChange={onStatusChange} />);
        expect(onStatusChange).toHaveBeenCalledWith('online');
    });

    // Snapshot Test
    it('sollte dem Snapshot entsprechen', () => {
        const { container } = render(<StatusIndicator />);
        expect(container).toMatchSnapshot();
    });

    // Snapshot Test mit Text
    it('sollte dem Snapshot mit Text entsprechen', () => {
        const { container } = render(<StatusIndicator withText={true} />);
        expect(container).toMatchSnapshot();
    });
});
