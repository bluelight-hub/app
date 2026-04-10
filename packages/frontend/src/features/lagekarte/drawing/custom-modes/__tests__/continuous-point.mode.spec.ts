import { describe, expect, it, vi } from 'vitest';
import { ContinuousPointMode } from '../continuous-point.mode';

describe('ContinuousPointMode', () => {
  it('markiert nach jedem Klick den Draw-Store als dirty', () => {
    const addFeature = vi.fn();
    const fire = vi.fn();
    const setDirty = vi.fn();
    const point = {
      toGeoJSON: vi.fn().mockReturnValue({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [7.1, 50.7] },
        properties: {},
      }),
    };

    ContinuousPointMode.onClick.call(
      {
        newFeature: vi.fn().mockReturnValue(point),
        addFeature,
        fire,
        _ctx: {
          store: {
            setDirty,
          },
        },
      },
      {},
      { lngLat: { lng: 7.1, lat: 50.7 } },
    );

    expect(addFeature).toHaveBeenCalledWith(point);
    expect(fire).toHaveBeenCalledWith('draw.create', { features: [point.toGeoJSON()] });
    expect(setDirty).toHaveBeenCalled();
  });
});
