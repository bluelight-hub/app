import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { GefahrenzoneDto } from '@bluelight-hub/shared/client';

const getQueryDataMock = vi.fn();
vi.mock('@/provider/query-client.provider', () => ({
  queryClient: { getQueryData: (...args: unknown[]) => getQueryDataMock(...args) },
}));

vi.mock('@/features/gefahrenzone/ui/organisms/GefahrenzoneDetailPanel', () => ({
  GefahrenzoneDetailPanel: () => <div data-testid="panel-stub" />,
}));

vi.mock('@/features/gefahrenzone/ui/organisms/GefahrenzoneDetailPopup', () => ({
  GefahrenzoneDetailPopup: () => <div data-testid="popup-stub" />,
}));

import { gefahrenzonenDetailProvider, getGefahrenzonenProviderEinsatzId, setGefahrenzonenProviderEinsatzId } from '../gefahrenzonen-detail-provider';

const polygonZone: GefahrenzoneDto = {
  id: 'z-1',
  einsatzId: 'e-1',
  gefahrentyp: 'BRAND',
  schutzobjekt: 'MENSCHEN',
  geometryType: 'POLYGON',
  geometry: {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [10, 0],
          [10, 10],
          [0, 10],
          [0, 0],
        ],
      ],
    },
  } as unknown as { [key: string]: unknown },
  bezeichnung: null,
  warnstufe: 'HOCH',
  erstelltVon: 'u',
  aktualisiertVon: null,
  erstelltAm: new Date(),
  aktualisiertAm: new Date(),
};

describe('gefahrenzonenDetailProvider', () => {
  beforeEach(() => {
    getQueryDataMock.mockReset();
    setGefahrenzonenProviderEinsatzId(null);
  });

  it('isActive nur wenn einsatzId gesetzt', () => {
    expect(gefahrenzonenDetailProvider.isActive()).toBe(false);
    setGefahrenzonenProviderEinsatzId('e-1');
    expect(gefahrenzonenDetailProvider.isActive()).toBe(true);
    expect(getGefahrenzonenProviderEinsatzId()).toBe('e-1');
  });

  it('queryFeature liefert null ohne einsatzId', async () => {
    const result = await gefahrenzonenDetailProvider.queryFeature(5, 5, {} as never);
    expect(result).toBeNull();
  });

  it('queryFeature liefert null wenn keine Zonen im Cache', async () => {
    setGefahrenzonenProviderEinsatzId('e-1');
    getQueryDataMock.mockReturnValueOnce(undefined);
    const result = await gefahrenzonenDetailProvider.queryFeature(5, 5, {} as never);
    expect(result).toBeNull();
  });

  it('queryFeature liefert Hit, wenn ein Punkt im Polygon liegt', async () => {
    setGefahrenzonenProviderEinsatzId('e-1');
    getQueryDataMock.mockReturnValueOnce([polygonZone]);
    const result = await gefahrenzonenDetailProvider.queryFeature(5, 5, {} as never);
    expect(result).not.toBeNull();
    expect(result!.providerId).toBe('gefahrenzonen');
    const data = result!.data as { zone: GefahrenzoneDto; einsatzId: string };
    expect(data.zone.id).toBe('z-1');
    expect(data.einsatzId).toBe('e-1');
  });

  it('queryFeature liefert null bei Miss', async () => {
    setGefahrenzonenProviderEinsatzId('e-1');
    getQueryDataMock.mockReturnValueOnce([polygonZone]);
    const result = await gefahrenzonenDetailProvider.queryFeature(50, 50, {} as never);
    expect(result).toBeNull();
  });

  it('renderPopup und renderPanel rendern die Stubs', () => {
    const info = { providerId: 'gefahrenzonen', title: 'x', data: { zone: polygonZone, einsatzId: 'e-1' }, coordinate: { lng: 5, lat: 5 } };
    const popup = gefahrenzonenDetailProvider.renderPopup(info);
    const panel = gefahrenzonenDetailProvider.renderPanel(info);
    expect(popup).toBeTruthy();
    expect(panel).toBeTruthy();
  });
});
