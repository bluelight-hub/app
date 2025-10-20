import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type L from 'leaflet';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock storage-quota utility
vi.mock('@/utils/storage-quota', () => ({
  getStorageQuota: vi.fn().mockResolvedValue({
    used: 100,
    available: 900,
    percentage: 10,
  }),
}));

// Mock offline-tiles utility
vi.mock('@/utils/offline-tiles', () => ({
  downloadTiles: vi.fn((baseLayer, bounds, zoomLevels, onProgress, onComplete, onError) => {
    // Simulate download progress
    setTimeout(() => onProgress(50), 10);
    setTimeout(() => {
      onProgress(100);
      onComplete();
    }, 50);
    return {}; // Mock save control
  }),
}));

// Mock leaflet library before anything else
vi.mock('leaflet', () => {
  const mockRectangleInstance = {
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => mockBounds),
    pm: {
      enable: vi.fn(),
    },
  };
  const mockRectangle = vi.fn(() => mockRectangleInstance);

  return {
    default: {
      Rectangle: mockRectangle,
    },
    Rectangle: mockRectangle,
  };
});

// Setup window.L for component usage
const mockBounds = {
  getNorth: () => 52.0,
  getSouth: () => 51.0,
  getEast: () => 11.0,
  getWest: () => 10.0,
  getCenter: () => ({ lat: 51.5, lng: 10.5 }),
  getNorthWest: () => ({ lat: 52.0, lng: 10.0 }),
  getSouthEast: () => ({ lat: 51.0, lng: 11.0 }),
} as L.LatLngBounds;

(global as typeof globalThis & { window: Window & typeof globalThis & { L: typeof import('leaflet') } }).window.L = {
  Rectangle: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => mockBounds),
    pm: {
      enable: vi.fn(),
    },
  })),
  tileLayer: {
    offline: vi.fn(() => ({
      // Mock offline TileLayer
    })),
  },
} as unknown as typeof import('leaflet');

// Mock geoman
vi.mock('@geoman-io/leaflet-geoman-free', () => ({}));
vi.mock('@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css', () => ({}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock react-leaflet components
vi.mock('react-leaflet', () => ({
  MapContainer: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="map-container" className={className}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMap: () => ({
    pm: {
      addControls: vi.fn(),
      removeControls: vi.fn(),
    },
    on: vi.fn(),
    off: vi.fn(),
    removeLayer: vi.fn(),
  }),
}));

import { OfflineRegionModal } from './OfflineRegionModal';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OfflineRegionModal', () => {
  it('renders modal when isOpen is true', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText('Offline-Region auswählen')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    const { container } = render(<OfflineRegionModal isOpen={false} onClose={vi.fn()} />);

    // Dialog should not be in the document when closed
    expect(container.querySelector('[role="dialog"]')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(<OfflineRegionModal isOpen={true} onClose={mockOnClose} />);

    const closeButton = screen.getByRole('button', { name: /modal schließen/i });
    await user.click(closeButton);

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('calls onClose when Abbrechen button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = vi.fn();
    render(<OfflineRegionModal isOpen={true} onClose={mockOnClose} />);

    const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders zoom-level slider with default value 15', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    const slider = screen.getByRole('slider', { name: /zoom-level auswählen/i });
    expect(slider).toBeInTheDocument();
    expect(slider).toHaveValue('15');
  });

  it('updates zoom-level when slider is changed', async () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    const slider = screen.getByRole('slider', { name: /zoom-level auswählen/i }) as HTMLInputElement;

    // Use fireEvent.change for range inputs to properly trigger React's onChange
    fireEvent.change(slider, { target: { value: '12' } });

    await waitFor(() => {
      expect(screen.getByText(/Zoom-Level: 12/i)).toBeInTheDocument();
    });
  });

  it('renders Download starten button', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    expect(downloadButton).toBeInTheDocument();
  });

  it('shows progress bar when downloading', async () => {
    const user = userEvent.setup();
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    await user.click(downloadButton);

    // Progress bar should appear
    await waitFor(() => {
      expect(screen.getByText(/lade tiles/i)).toBeInTheDocument();
    });

    // Button should show "Lädt..."
    expect(screen.getByRole('button', { name: /lädt.../i })).toBeInTheDocument();
  });

  it('disables buttons while downloading', async () => {
    const user = userEvent.setup();
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    await user.click(downloadButton);

    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /modal schließen/i });
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      const slider = screen.getByRole('slider', { name: /zoom-level auswählen/i });

      expect(closeButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(slider).toBeDisabled();
    });
  });

  it('renders map for region selection (Task 4)', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    // Check that map container is rendered
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
    expect(screen.getByTestId('tile-layer')).toBeInTheDocument();
  });

  it('renders map with currentMapBounds when provided', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    // Map should be rendered
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders instructional text for region selection', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/zeichne ein rechteck auf der karte/i)).toBeInTheDocument();
  });

  it('renders placeholder for storage info (Task 6)', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByText(/loading... \(task 6\)/i)).toBeInTheDocument();
  });

  it('has correct accessibility attributes', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    // Progress bar (when downloading) should have ARIA attributes
    // Test indirectly by checking if slider has aria-label
    const slider = screen.getByRole('slider', { name: /zoom-level auswählen/i });
    expect(slider).toHaveAttribute('aria-label');
  });

  it('calculates and displays tile count when bounds are selected (Task 5)', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    // Should display tile count and size estimation
    expect(screen.getByText(/ca\. \d+ tiles \(\d+ mb\)/i)).toBeInTheDocument();
  });

  it('shows warning for large downloads >1000 tiles (Task 5)', async () => {
    // Create very large bounds to trigger >1000 tiles warning
    const largeBounds = {
      getNorth: () => 55.0,
      getSouth: () => 45.0,
      getEast: () => 20.0,
      getWest: () => 5.0,
      getCenter: () => ({ lat: 50.0, lng: 12.5 }),
      getNorthWest: () => ({ lat: 55.0, lng: 5.0 }),
      getSouthEast: () => ({ lat: 45.0, lng: 20.0 }),
    } as L.LatLngBounds;

    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={largeBounds} />);

    // Should show warning for large download
    await waitFor(() => {
      expect(screen.getByText(/großer download! kann länger dauern/i)).toBeInTheDocument();
    });
  });

  it('updates tile count when zoom level changes (Task 5)', async () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    const slider = screen.getByRole('slider', { name: /zoom-level auswählen/i }) as HTMLInputElement;

    // Get initial tile count text
    const initialTileText = screen.getByText(/ca\. \d+ tiles \(\d+ mb\)/i).textContent;

    // Change zoom level
    fireEvent.change(slider, { target: { value: '18' } });

    // Wait for recalculation
    await waitFor(() => {
      const newTileText = screen.getByText(/ca\. \d+ tiles \(\d+ mb\)/i).textContent;
      // Tile count should change with zoom level
      expect(newTileText).not.toBe(initialTileText);
    });
  });

  it('shows placeholder text when no bounds are selected (Task 5)', () => {
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    // Should show placeholder when no bounds selected
    expect(screen.getByText(/wähle eine region aus, um die größe zu berechnen/i)).toBeInTheDocument();
  });

  it('displays storage quota when available (Task 6)', async () => {
    const { getStorageQuota } = await import('@/utils/storage-quota');
    vi.mocked(getStorageQuota).mockResolvedValue({
      used: 100,
      available: 900,
      percentage: 10,
    });

    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    // Wait for storage quota to load
    await waitFor(() => {
      expect(screen.getByText(/verfügbarer speicher/i)).toBeInTheDocument();
      expect(screen.getByText(/900 MB \(90% frei\)/i)).toBeInTheDocument();
    });
  });

  it('shows warning when storage <10% available (Task 6)', async () => {
    const { getStorageQuota } = await import('@/utils/storage-quota');
    vi.mocked(getStorageQuota).mockResolvedValue({
      used: 950,
      available: 50,
      percentage: 95,
    });

    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    // Wait for warning to appear
    await waitFor(() => {
      expect(screen.getByText(/wenig speicher! bitte platz freigeben/i)).toBeInTheDocument();
    });

    // Should use orange warning styling
    await waitFor(() => {
      const warningElement = screen.getByText(/wenig speicher! bitte platz freigeben/i);
      expect(warningElement).toHaveClass('text-orange-900');
    });
  });

  it('handles storage quota API errors gracefully (Task 6)', async () => {
    const { getStorageQuota } = await import('@/utils/storage-quota');
    vi.mocked(getStorageQuota).mockRejectedValue(new Error('Storage API not supported'));

    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    // Wait for error message
    await waitFor(() => {
      expect(screen.getByText(/speicher-info nicht verfügbar/i)).toBeInTheDocument();
      expect(screen.getByText(/storage api not supported/i)).toBeInTheDocument();
    });
  });

  it('fetches storage quota only when modal opens (Task 6)', async () => {
    const { getStorageQuota } = await import('@/utils/storage-quota');
    const mockGetStorageQuota = vi.mocked(getStorageQuota);
    mockGetStorageQuota.mockClear();

    const { rerender } = render(<OfflineRegionModal isOpen={false} onClose={vi.fn()} />);

    // Should not fetch when closed
    expect(mockGetStorageQuota).not.toHaveBeenCalled();

    // Rerender with isOpen=true
    rerender(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    // Should fetch when opened
    await waitFor(() => {
      expect(mockGetStorageQuota).toHaveBeenCalledTimes(1);
    });
  });

  it('calls downloadTiles when Download button is clicked (Task 8)', async () => {
    const { downloadTiles } = await import('@/utils/offline-tiles');
    const mockDownloadTiles = vi.mocked(downloadTiles);
    mockDownloadTiles.mockClear();

    const user = userEvent.setup();
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    await user.click(downloadButton);

    // Should call downloadTiles with correct parameters
    await waitFor(() => {
      expect(mockDownloadTiles).toHaveBeenCalledTimes(1);
      expect(mockDownloadTiles).toHaveBeenCalledWith(
        expect.anything(), // offlineLayer
        mockBounds, // selectedBounds
        [15], // zoomLevel array
        expect.any(Function), // onProgress
        expect.any(Function), // onComplete
        expect.any(Function), // onError
      );
    });
  });

  it('updates progress during download (Task 8)', async () => {
    const user = userEvent.setup();
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    await user.click(downloadButton);

    // Progress bar should appear
    await waitFor(() => {
      expect(screen.getByText(/lade tiles/i)).toBeInTheDocument();
    });

    // Progress should update (mocked to 50% then 100%)
    await waitFor(
      () => {
        const progressBar = screen.getByRole('progressbar');
        expect(progressBar).toHaveAttribute('aria-valuenow');
      },
      { timeout: 200 },
    );
  });

  it('disables buttons during download (Task 8)', async () => {
    const { downloadTiles } = await import('@/utils/offline-tiles');
    vi.mocked(downloadTiles).mockImplementation((baseLayer, bounds, zoomLevels, onProgress, onComplete, onError) => {
      // Don't auto-complete for this test
      setTimeout(() => onProgress(50), 10);
      return {} as L.Control.SaveTiles;
    });

    const user = userEvent.setup();
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} currentMapBounds={mockBounds} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    await user.click(downloadButton);

    // Buttons should be disabled
    await waitFor(() => {
      const closeButton = screen.getByRole('button', { name: /modal schließen/i });
      const cancelButton = screen.getByRole('button', { name: /abbrechen/i });
      const loadingButton = screen.getByRole('button', { name: /lädt\.\.\./i });

      expect(closeButton).toBeDisabled();
      expect(cancelButton).toBeDisabled();
      expect(loadingButton).toBeDisabled();
    });
  });

  it('prevents download when no bounds selected (Task 8)', async () => {
    const { downloadTiles } = await import('@/utils/offline-tiles');
    const mockDownloadTiles = vi.mocked(downloadTiles);
    mockDownloadTiles.mockClear();

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const user = userEvent.setup();
    // Render without currentMapBounds
    render(<OfflineRegionModal isOpen={true} onClose={vi.fn()} />);

    const downloadButton = screen.getByRole('button', { name: /download starten/i });
    await user.click(downloadButton);

    // Should not call downloadTiles
    expect(mockDownloadTiles).not.toHaveBeenCalled();

    // Should log error
    expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No bounds selected'));

    consoleErrorSpy.mockRestore();
  });
});
