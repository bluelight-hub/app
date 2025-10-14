import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LagekarteView } from './LagekarteView';

// Mock useColorMode hook
vi.mock('@/hooks/use-color-mode', () => ({
  useColorMode: vi.fn(() => ({
    resolvedColorMode: 'light',
    colorMode: 'light',
    setColorMode: vi.fn(),
    toggleColorMode: vi.fn(),
  })),
}));

// Store tileerror callback for testing
let tileErrorCallback: (() => void) | null = null;

// Mock react-leaflet to avoid Leaflet initialization in tests
vi.mock('react-leaflet', () => ({
  MapContainer: ({
    children,
    whenReady,
    'aria-label': ariaLabel,
    center,
    zoom,
  }: {
    children: React.ReactNode;
    whenReady?: () => void;
    'aria-label'?: string;
    center?: [number, number];
    zoom?: number;
  }) => {
    // Simulate map ready callback
    if (whenReady) {
      setTimeout(whenReady, 0);
    }
    return (
      <section aria-label={ariaLabel} data-testid="map-container" data-center={JSON.stringify(center)} data-zoom={zoom}>
        {children}
      </section>
    );
  },
  TileLayer: ({ url, attribution }: { url: string; attribution: string }) => (
    <div data-testid="tile-layer" data-url={url} data-attribution={attribution}>
      Tile Layer
    </div>
  ),
  useMapEvents: ({ tileerror }: { tileerror?: () => void }) => {
    // Store callback for testing
    if (tileerror) {
      tileErrorCallback = tileerror;
    }
    return null;
  },
}));

describe('LagekarteView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tileErrorCallback = null; // Reset error callback
  });

  it('should render map container with correct ARIA label', async () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert
    await waitFor(() => {
      expect(screen.getByRole('region', { name: 'Lagekarte' })).toBeInTheDocument();
    });
  });

  it('should render OSM tiles in light mode', () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert
    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  });

  it('should render CartoDB Dark Matter tiles in dark mode', async () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';
    const { useColorMode } = await import('@/hooks/use-color-mode');

    // Mock dark mode
    vi.mocked(useColorMode).mockReturnValue({
      resolvedColorMode: 'dark',
      colorMode: 'dark',
      setColorMode: vi.fn(),
      toggleColorMode: vi.fn(),
    });

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert
    const tileLayer = screen.getByTestId('tile-layer');
    expect(tileLayer).toHaveAttribute('data-url', 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png');
  });

  it('should have correct mobile-responsive classes', () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    const { container } = render(<LagekarteView einsatzId={einsatzId} />);

    // Assert
    const mapWrapper = container.firstChild as HTMLElement;
    expect(mapWrapper).toHaveClass('h-[calc(100vh-120px)]');
    expect(mapWrapper).toHaveClass('md:h-[600px]');
  });

  it('should display loading spinner initially', () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert - Spinner sollte sichtbar sein während isLoading=true
    const spinner = document.querySelector('.absolute.inset-0');
    expect(spinner).toBeInTheDocument();
  });

  it('should hide loading spinner after map is ready', async () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert - Warte bis whenReady callback feuert
    await waitFor(
      () => {
        const spinner = document.querySelector('.absolute.inset-0');
        expect(spinner).not.toBeInTheDocument();
      },
      { timeout: 100 },
    );
  });

  it('should render with default center position (Germany center)', () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';
    const expectedCenter = [51.1657, 10.4515];

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert
    const mapContainer = screen.getByTestId('map-container');
    const centerData = mapContainer.getAttribute('data-center');
    expect(centerData).toBe(JSON.stringify(expectedCenter));
  });

  it('should render with default zoom level 6', () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Assert
    const mapContainer = screen.getByTestId('map-container');
    expect(mapContainer).toHaveAttribute('data-zoom', '6');
  });

  it('should display error message when tile loading fails', async () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Trigger tile error via callback
    await act(async () => {
      if (tileErrorCallback) {
        tileErrorCallback();
      }
    });

    // Assert
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Karte konnte nicht geladen werden')).toBeInTheDocument();
    expect(screen.getByText(/Die Karten-Tiles konnten nicht vom Server geladen werden/)).toBeInTheDocument();
  });

  it('should show retry button when error occurs', async () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';

    // Act
    render(<LagekarteView einsatzId={einsatzId} />);

    // Trigger tile error
    await act(async () => {
      if (tileErrorCallback) {
        tileErrorCallback();
      }
    });

    // Assert
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should reset error state and reload map when retry button is clicked', async () => {
    // Arrange
    const einsatzId = 'test-einsatz-123';
    render(<LagekarteView einsatzId={einsatzId} />);

    // Trigger error
    await act(async () => {
      if (tileErrorCallback) {
        tileErrorCallback();
      }
    });

    // Assert error state
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Act - Click retry
    const retryButton = screen.getByRole('button', { name: /erneut versuchen/i });
    await act(async () => {
      fireEvent.click(retryButton);
    });

    // Assert - Error should be gone, map should be visible again
    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
      expect(screen.getByRole('region', { name: 'Lagekarte' })).toBeInTheDocument();
    });
  });
});
