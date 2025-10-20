import { describe, it, expect, vi, beforeEach } from 'vitest';
import type L from 'leaflet';

// Mock leaflet.offline
vi.mock('leaflet.offline', () => ({}));

// Create mock save control outside
const mockSaveControl = {
  _saveTiles: vi.fn(),
  addTo: vi.fn().mockReturnThis(),
};

// Mock leaflet with control.savetiles
vi.mock('leaflet', () => {
  return {
    default: {
      control: {
        savetiles: vi.fn(() => mockSaveControl),
      },
    },
    control: {
      savetiles: vi.fn(() => mockSaveControl),
    },
  };
});

import { downloadTiles } from './offline-tiles';
import LeafletModule from 'leaflet';

describe('downloadTiles', () => {
  let mockMap: L.Map;
  let mockTileLayer: L.TileLayer;
  let mockBounds: L.LatLngBounds;
  let onProgress: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock map with removeLayer method
    mockMap = {
      removeLayer: vi.fn(),
    } as unknown as L.Map;

    // Create mock tile layer with event emitter methods
    mockTileLayer = {
      on: vi.fn(),
      off: vi.fn(),
      addTo: vi.fn().mockReturnThis(),
    } as unknown as L.TileLayer;

    // Create mock bounds
    mockBounds = {} as L.LatLngBounds;

    // Create callback mocks
    onProgress = vi.fn();
    onComplete = vi.fn();
    onError = vi.fn();
  });

  it('should create save control with correct parameters', () => {
    const zoomLevels = [13, 14, 15];

    downloadTiles(mockMap, mockTileLayer, mockBounds, zoomLevels, onProgress, onComplete, onError);

    expect(LeafletModule.control.savetiles).toHaveBeenCalledWith(mockTileLayer, {
      zoomlevels: zoomLevels,
      bounds: mockBounds,
      confirm: null,
    });
  });

  it('should set up event listeners on baseLayer for savestart, savetileend, saveend, tileerror', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockTileLayer.on).toHaveBeenCalledWith('savestart', expect.any(Function));
    expect(mockTileLayer.on).toHaveBeenCalledWith('savetileend', expect.any(Function));
    expect(mockTileLayer.on).toHaveBeenCalledWith('saveend', expect.any(Function));
    expect(mockTileLayer.on).toHaveBeenCalledWith('tileerror', expect.any(Function));
  });

  it('should add baseLayer to map for event system', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockTileLayer.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('should add control to map', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockSaveControl.addTo).toHaveBeenCalledWith(mockMap);
  });

  it('should trigger tile download by calling _saveTiles', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockSaveControl._saveTiles).toHaveBeenCalled();
  });

  it('should call onProgress with 0 on savestart event', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get the savestart handler from mockTileLayer.on
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const savestartHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'savestart')?.[1];

    // Simulate savestart event
    savestartHandler({ _tilesforSave: new Array(100) });

    expect(onProgress).toHaveBeenCalledWith(0);
  });

  it('should calculate progress correctly during tile downloads', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get handlers from mockTileLayer.on
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const savestartHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'savestart')?.[1];
    const savetileendHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'savetileend')?.[1];

    // Simulate download of 100 tiles
    savestartHandler({ _tilesforSave: new Array(100) });

    // Clear initial onProgress(0) call
    onProgress.mockClear();

    // Simulate downloading 50 tiles
    for (let i = 0; i < 50; i++) {
      savetileendHandler();
    }

    // Should have called onProgress with 50%
    expect(onProgress).toHaveBeenCalledWith(50);
  });

  it('should call onComplete with 100% progress on saveend event', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get handlers from mockTileLayer.on
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const saveendHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'saveend')?.[1];

    // Simulate completion
    saveendHandler();

    expect(onProgress).toHaveBeenCalledWith(100);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should clean up event listeners and remove layer on saveend', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get saveend handler
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const saveendHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'saveend')?.[1];

    // Simulate completion
    saveendHandler();

    // Verify event listener cleanup
    expect(mockTileLayer.off).toHaveBeenCalledWith('savestart');
    expect(mockTileLayer.off).toHaveBeenCalledWith('savetileend');
    expect(mockTileLayer.off).toHaveBeenCalledWith('saveend');
    expect(mockTileLayer.off).toHaveBeenCalledWith('tileerror');

    // Verify layer removal from map
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockTileLayer);
  });

  it('should clean up on tileerror', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get tileerror handler
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const tileerrorHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'tileerror')?.[1];

    // Simulate error
    tileerrorHandler({ error: 'Network error' });

    // Verify cleanup
    expect(mockTileLayer.off).toHaveBeenCalledWith('savestart');
    expect(mockTileLayer.off).toHaveBeenCalledWith('savetileend');
    expect(mockTileLayer.off).toHaveBeenCalledWith('saveend');
    expect(mockTileLayer.off).toHaveBeenCalledWith('tileerror');
    expect(mockMap.removeLayer).toHaveBeenCalledWith(mockTileLayer);
  });

  it('should call onError on tileerror event', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get tileerror handler from mockTileLayer.on
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const tileerrorHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'tileerror')?.[1];

    // Simulate error
    tileerrorHandler({ error: 'Network error' });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network error' }));
  });

  it('should handle tileerror without error message', () => {
    downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get tileerror handler from mockTileLayer.on
    const onMock = mockTileLayer.on as ReturnType<typeof vi.fn>;
    const tileerrorHandler = onMock.mock.calls.find((call: unknown[]) => call[0] === 'tileerror')?.[1];

    // Simulate error without message
    tileerrorHandler({});

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tile download failed' }));
  });

  it('should return save control instance', () => {
    const control = downloadTiles(mockMap, mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(control).toBe(mockSaveControl);
  });
});
