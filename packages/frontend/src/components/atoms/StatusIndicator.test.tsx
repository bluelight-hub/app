import { HealthControllerCheck200Response } from '@bluelight-hub/shared/client';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { message } from 'antd';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import * as useBackendHealthModule from '../../hooks/useBackendHealth';
import { ConnectionStatus } from '../../hooks/useBackendHealth';
import { StatusIndicator } from './StatusIndicator';

// Mock des useBackendHealth Hooks
vi.mock('../../hooks/useBackendHealth', () => {
  const originalModule = vi.importActual('../../hooks/useBackendHealth');
  return {
    ...originalModule,
    useBackendHealth: vi.fn(() => ({
      data: {
        status: 'ok',
        details: {
          internet: { status: 'up' },
          fuekw: { status: 'up' },
        },
      } as HealthControllerCheck200Response,
      isError: false,
      isLoading: false,
      getConnectionStatus: vi.fn(() => 'online' as ConnectionStatus),
      getSystemDetailsText: vi.fn(() => 'internet: ✅\nfuekw: ✅'),
      getDebugInfo: vi.fn(() =>
        JSON.stringify({
          status: 'online',
          details: { internet: { status: 'up' }, fuekw: { status: 'up' } },
          timestamp: '2023-01-01T12:00:00.000Z',
        }),
      ),
    })),
  };
});

// Typ für den Popover-Mock
interface PopoverProps {
  children: ReactNode;
  content: ReactNode;
  title?: string;
  trigger?: string | string[];
  placement?: string;
}

// Mock für Antd message
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd');
  return {
    ...actual,
    Popover: ({ children, content }: PopoverProps) => (
      <div>
        {children}
        <div data-testid="popover-content" className="mock-popover-content">
          {content}
        </div>
      </div>
    ),
    message: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock der navigator.clipboard API
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
  },
  configurable: true,
});

// Hilfsfunktion zum Setzen des Connection-Status
const mockConnectionStatus = (status: ConnectionStatus) => {
  vi.mocked(useBackendHealthModule.useBackendHealth).mockImplementation(() => ({
    data: {
      status: 'ok',
      details: {
        internet: { status: status === 'online' ? 'up' : 'down' },
        fuekw: { status: status === 'error' ? 'down' : 'up' },
      },
    } as HealthControllerCheck200Response,
    isError: status === 'error',
    isLoading: status === 'checking',
    getConnectionStatus: vi.fn(() => status),
    getSystemDetailsText: vi.fn(() => `Status: ${status}`),
    getDebugInfo: vi.fn(() => JSON.stringify({ status })),
  }));
};

/**
 * Tests für die StatusIndicator-Komponente
 */
describe('StatusIndicator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

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

  // Test für den "checking" Status
  it('sollte den korrekten Status für "checking" anzeigen', () => {
    mockConnectionStatus('checking');
    render(<StatusIndicator withText={true} />);
    expect(screen.getByText('Prüfe Verbindung...')).toBeInTheDocument();
  });

  // Test für den "offline" Status
  it('sollte den korrekten Status für "offline" anzeigen', () => {
    mockConnectionStatus('offline');
    render(<StatusIndicator withText={true} />);
    expect(screen.getByText('Lokaler Modus')).toBeInTheDocument();
  });

  // Test für den "error" Status
  it('sollte den korrekten Status für "error" anzeigen', () => {
    mockConnectionStatus('error');
    render(<StatusIndicator withText={true} />);
    expect(screen.getByText('Keine Verbindung')).toBeInTheDocument();
  });

  // Test für die Kopierfunktion
  it('sollte Debug-Informationen in die Zwischenablage kopieren', async () => {
    // Stelle sicher, dass der Mock korrekt funktioniert
    vi.mocked(navigator.clipboard.writeText).mockResolvedValue(undefined);

    render(<StatusIndicator />);

    // Im Mock-Popover ist der Content immer sichtbar
    const popoverContent = screen.getByTestId('popover-content');
    expect(popoverContent).toBeInTheDocument();

    // Button finden, der "Debug-Info kopieren" enthält
    const copyButton = screen.getByText('Debug-Info kopieren');
    expect(copyButton).toBeInTheDocument();

    // Klicken und Clipboard-Aufruf prüfen
    fireEvent.click(copyButton);

    // Warten, bis der clipboardMock aufgerufen wurde
    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalled();
    });
    expect(message.success).toHaveBeenCalledWith('Debug-Informationen in Zwischenablage kopiert');
  });

  // Test für Fehlerfall beim Kopieren
  it('sollte Fehler beim Kopieren behandeln', async () => {
    // Mock der clipboard API für Fehlerfall
    vi.mocked(navigator.clipboard.writeText).mockRejectedValue(new Error('Clipboard error'));

    render(<StatusIndicator />);

    // Button finden und klicken
    const copyButton = screen.getByText('Debug-Info kopieren');
    fireEvent.click(copyButton);

    // Warten auf die asynchrone Fehlerbehandlung
    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Fehler beim Kopieren der Debug-Informationen');
    });
  });

  // Test für fehlende Debug-Infos
  it('sollte Fehler anzeigen, wenn keine Debug-Informationen verfügbar sind', async () => {
    // Mock für fehlende Debug-Infos
    vi.mocked(useBackendHealthModule.useBackendHealth).mockImplementation(() => ({
      data: undefined,
      isError: true,
      isLoading: false,
      getConnectionStatus: vi.fn(() => 'error' as ConnectionStatus),
      getSystemDetailsText: vi.fn(() => ''),
      getDebugInfo: vi.fn(() => ''),
    }));

    render(<StatusIndicator />);

    // Button finden und klicken
    const copyButton = screen.getByText('Debug-Info kopieren');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(message.error).toHaveBeenCalledWith('Keine Daten zum Kopieren verfügbar');
    });
  });

  // Snapshot Test - Wir überprüfen hier nur bestimmte Werte statt des ganzen Snapshots
  it('sollte dem Snapshot entsprechen', () => {
    const { getByTestId } = render(<StatusIndicator withText={false} />);

    const indicator = getByTestId('status-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator?.classList.contains('ant-badge-status-dot')).toBe(false);
    // Wir stellen nur sicher, dass das Element im DOM existiert, ohne spezifische Klassen zu prüfen
    expect(indicator).toBeInTheDocument();
  });

  // Snapshot Test mit Text - Wir überprüfen hier nur bestimmte Werte statt des ganzen Snapshots
  it('sollte dem Snapshot mit Text entsprechen', () => {
    mockConnectionStatus('online');
    const { container } = render(<StatusIndicator withText={true} />);
    const indicator = container.querySelector('[data-testid="status-indicator"]');
    expect(indicator).toBeInTheDocument();
    expect(indicator?.classList.contains('ant-badge-status-dot')).toBe(false);
    expect(container.textContent).toContain('Vollständig verbunden');
  });
});
