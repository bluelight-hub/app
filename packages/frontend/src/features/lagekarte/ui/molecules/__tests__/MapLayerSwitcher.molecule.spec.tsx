/**
 * Unit Tests für MapLayerSwitcher Molecule
 *
 * Verifiziert die Legende-Section im Popover (Story 4.3 T7.4).
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MapLayerSwitcher } from '../MapLayerSwitcher.molecule';
import { renderWithProviders } from '@/test/utils';
import type { BaseLayerConfig } from '../../../utils/map-config';

vi.mock('../../../stores/map-layer.store', async () => {
  const actual = await vi.importActual<typeof import('../../../stores/map-layer.store')>('../../../stores/map-layer.store');
  return {
    ...actual,
    setBaseLayer: vi.fn(),
    setDwdOverlay: vi.fn(),
    setNinaOverlay: vi.fn(),
  };
});

const baseLayer: BaseLayerConfig = {
  id: 'osm',
  label: 'OSM',
  styleLight: 'https://example.com/style.json',
  styleDark: null,
  requiresApiKey: false,
};

describe('MapLayerSwitcher', () => {
  it('zeigt Legende-Eintrag „Sicherungsposten" im Popover', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <MapLayerSwitcher availableLayers={[baseLayer]} selectedBaseLayer="osm" dwdOverlayEnabled={false} ninaOverlays={{ katwarn: false, biwapp: false, mowas: false, lhp: false, police: false }} />,
    );

    await user.click(screen.getByLabelText('Kartengrundlage wechseln'));
    const legend = await screen.findByTestId('map-legend-sicherungsposten');
    expect(legend).toBeInTheDocument();
    expect(legend).toHaveTextContent('Sicherungsposten');
  });
});
