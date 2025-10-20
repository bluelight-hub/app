import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import type L from 'leaflet';

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
} as L.LatLngBounds;

(global as typeof globalThis & { window: Window & typeof globalThis & { L: typeof import('leaflet') } }).window.L = {
  Rectangle: vi.fn(() => ({
    addTo: vi.fn().mockReturnThis(),
    getBounds: vi.fn(() => mockBounds),
    pm: {
      enable: vi.fn(),
    },
  })),
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
});
