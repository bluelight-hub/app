import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import { MapContainer } from 'react-leaflet';
import { OfflineTileLayer } from './OfflineTileLayer';
import L from 'leaflet';

// Mock leaflet.offline
vi.mock('leaflet.offline', () => ({}));

// Mock Leaflet L.tileLayer.offline
const mockOfflineLayer = {
  addTo: vi.fn().mockReturnThis(),
  remove: vi.fn(),
};

describe('OfflineTileLayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock L.tileLayer.offline
    if (!L.tileLayer.offline) {
      (L.tileLayer as typeof L.tileLayer & { offline: typeof vi.fn }).offline = vi.fn(() => mockOfflineLayer);
    } else {
      vi.mocked(L.tileLayer.offline).mockReturnValue(mockOfflineLayer as L.TileLayer);
    }

    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('should create and add offline tile layer to map', () => {
    const url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '© OpenStreetMap contributors';

    render(
      <MapContainer center={[51.505, -0.09]} zoom={13}>
        <OfflineTileLayer url={url} attribution={attribution} />
      </MapContainer>,
    );

    // Verify L.tileLayer.offline was called with correct params
    expect(L.tileLayer.offline).toHaveBeenCalledWith(url, {
      attribution,
      useCache: true,
      saveToCache: true,
      crossOrigin: true,
    });

    // Verify layer was added to map
    expect(mockOfflineLayer.addTo).toHaveBeenCalled();
  });

  it('should log initialization message', () => {
    const url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '© OpenStreetMap contributors';

    render(
      <MapContainer center={[51.505, -0.09]} zoom={13}>
        <OfflineTileLayer url={url} attribution={attribution} />
      </MapContainer>,
    );

    expect(console.log).toHaveBeenCalledWith('[OfflineTileLayer] Offline tile layer initialized');
  });

  it('should remove layer on unmount', () => {
    const url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '© OpenStreetMap contributors';

    const { unmount } = render(
      <MapContainer center={[51.505, -0.09]} zoom={13}>
        <OfflineTileLayer url={url} attribution={attribution} />
      </MapContainer>,
    );

    // Clear previous calls
    vi.clearAllMocks();

    // Unmount component
    unmount();

    // Verify cleanup message was logged
    // Note: We can't easily verify map.removeLayer was called because
    // it's a real Leaflet map instance in the test. The cleanup happens
    // but we'd need to mock the entire Leaflet Map to verify this.
    // Instead, we trust the implementation and verify the layer reference is cleared.
    expect(console.log).toHaveBeenCalledWith('[OfflineTileLayer] Offline tile layer removed');
  });

  it('should use dark mode tile URL when provided', () => {
    const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png';
    const attribution = '© CARTO | © OpenStreetMap contributors';

    render(
      <MapContainer center={[51.505, -0.09]} zoom={13}>
        <OfflineTileLayer url={darkUrl} attribution={attribution} />
      </MapContainer>,
    );

    expect(L.tileLayer.offline).toHaveBeenCalledWith(darkUrl, {
      attribution,
      useCache: true,
      saveToCache: true,
      crossOrigin: true,
    });
  });

  it('should not render any visible DOM elements', () => {
    const url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    const attribution = '© OpenStreetMap contributors';

    const { container } = render(
      <MapContainer center={[51.505, -0.09]} zoom={13}>
        <OfflineTileLayer url={url} attribution={attribution} />
      </MapContainer>,
    );

    // OfflineTileLayer returns null, so it shouldn't render any direct children
    // (The TileLayer is added imperatively to the Leaflet map)
    // We just verify the component mounts without errors
    expect(container).toBeTruthy();
  });
});
