import { describe, it, expect, vi, beforeEach } from 'vitest';
import type L from 'leaflet';

// Mock leaflet.offline
vi.mock('leaflet.offline', () => ({}));

// Mock leaflet with control.savetiles
vi.mock('leaflet', () => {
  const mockSaveControl = {
    on: vi.fn(),
    setBounds: vi.fn(),
    _saveTiles: vi.fn(),
  };

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

describe('downloadTiles', () => {
  let mockTileLayer: L.TileLayer;
  let mockBounds: L.LatLngBounds;
  let onProgress: ReturnType<typeof vi.fn>;
  let onComplete: ReturnType<typeof vi.fn>;
  let onError: ReturnType<typeof vi.fn>;
  let mockSaveControl: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Create mock tile layer
    mockTileLayer = {} as L.TileLayer;

    // Create mock bounds
    mockBounds = {} as L.LatLngBounds;

    // Create callback mocks
    onProgress = vi.fn();
    onComplete = vi.fn();
    onError = vi.fn();

    // Get mock save control
    const L = require('leaflet');
    mockSaveControl = L.control.savetiles();
  });

  it('should create save control with correct parameters', () => {
    const L = require('leaflet');
    const zoomLevels = [13, 14, 15];

    downloadTiles(mockTileLayer, mockBounds, zoomLevels, onProgress, onComplete, onError);

    expect(L.control.savetiles).toHaveBeenCalledWith(mockTileLayer, {
      zoomlevels: zoomLevels,
      confirm: null,
    });
  });

  it('should set up event listeners for savestart, savetileend, saveend, tileerror', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockSaveControl.on).toHaveBeenCalledWith('savestart', expect.any(Function));
    expect(mockSaveControl.on).toHaveBeenCalledWith('savetileend', expect.any(Function));
    expect(mockSaveControl.on).toHaveBeenCalledWith('saveend', expect.any(Function));
    expect(mockSaveControl.on).toHaveBeenCalledWith('tileerror', expect.any(Function));
  });

  it('should set bounds on save control', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockSaveControl.setBounds).toHaveBeenCalledWith(mockBounds);
  });

  it('should trigger tile download by calling _saveTiles', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(mockSaveControl._saveTiles).toHaveBeenCalled();
  });

  it('should call onProgress with 0 on savestart event', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get the savestart handler
    const savestartHandler = mockSaveControl.on.mock.calls.find((call: unknown[]) => call[0] === 'savestart')?.[1];

    // Simulate savestart event
    savestartHandler({ _tilesforSave: new Array(100) });

    expect(onProgress).toHaveBeenCalledWith(0);
  });

  it('should calculate progress correctly during tile downloads', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get handlers
    const savestartHandler = mockSaveControl.on.mock.calls.find((call: unknown[]) => call[0] === 'savestart')?.[1];
    const savetileendHandler = mockSaveControl.on.mock.calls.find((call: unknown[]) => call[0] === 'savetileend')?.[1];

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
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get handlers
    const saveendHandler = mockSaveControl.on.mock.calls.find((call: unknown[]) => call[0] === 'saveend')?.[1];

    // Simulate completion
    saveendHandler();

    expect(onProgress).toHaveBeenCalledWith(100);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should call onError on tileerror event', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get tileerror handler
    const tileerrorHandler = mockSaveControl.on.mock.calls.find((call: unknown[]) => call[0] === 'tileerror')?.[1];

    // Simulate error
    tileerrorHandler({ error: 'Network error' });

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Network error' }));
  });

  it('should handle tileerror without error message', () => {
    downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    // Get tileerror handler
    const tileerrorHandler = mockSaveControl.on.mock.calls.find((call: unknown[]) => call[0] === 'tileerror')?.[1];

    // Simulate error without message
    tileerrorHandler({});

    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ message: 'Tile download failed' }));
  });

  it('should return save control instance', () => {
    const control = downloadTiles(mockTileLayer, mockBounds, [15], onProgress, onComplete, onError);

    expect(control).toBe(mockSaveControl);
  });
});
