/**
 * Unit Tests fuer PresetBar Molecule
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.9 Task 3:** PresetBar zeigt gespeicherte Filter-Presets als Chips
 * - Rendert nichts wenn keine Presets vorhanden
 * - Klick auf Chip aktiviert Preset (applyPreset)
 * - X-Button loescht Preset (removePreset)
 * - Aktiver Preset visuell hervorgehoben (ring-2, bg-primary-50)
 * - Inaktiver Preset hat Standard-Klassen (bg-gray-100)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PresetBar } from '../PresetBar';
import type { FilterPresetType } from '../../../stores/filter-preset.store';

// Store mocken
vi.mock('../../../stores/filter-preset.store', () => ({
  useFilterPresets: vi.fn(),
  useActivePresetId: vi.fn(),
  applyPreset: vi.fn(),
  removePreset: vi.fn(),
  isPresetActive: vi.fn(),
}));

import { useFilterPresets, useActivePresetId, applyPreset, removePreset, isPresetActive } from '../../../stores/filter-preset.store';

const mockUseFilterPresets = vi.mocked(useFilterPresets);
const mockUseActivePresetId = vi.mocked(useActivePresetId);
const mockApplyPreset = vi.mocked(applyPreset);
const mockRemovePreset = vi.mocked(removePreset);
const mockIsPresetActive = vi.mocked(isPresetActive);

// Test-Presets
const presetMeine: FilterPresetType = {
  id: 'preset-1',
  name: 'Meine ueberfaelligen',
  teamFilter: { type: 'mine' },
  kategorieFilter: { type: 'all' },
  statusFilter: { type: 'all' },
  sortierung: 'faelligkeit-asc',
};

const presetLeitstelle: FilterPresetType = {
  id: 'preset-2',
  name: 'Leitstelle Geplant',
  teamFilter: { type: 'all' },
  kategorieFilter: { type: 'kategorie', kategorieId: 'kat-1' },
  statusFilter: { type: 'status', status: 'GEPLANT' },
  sortierung: 'faelligkeit-asc',
};

const presetDritt: FilterPresetType = {
  id: 'preset-3',
  name: 'Drittes Preset',
  teamFilter: { type: 'unassigned' },
  kategorieFilter: { type: 'all' },
  statusFilter: { type: 'all' },
  sortierung: 'erstellung-desc',
};

describe('PresetBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: keine Presets, kein aktives Preset
    mockUseFilterPresets.mockReturnValue([]);
    mockUseActivePresetId.mockReturnValue(null);
    mockIsPresetActive.mockReturnValue(false);
  });

  describe('rendering', () => {
    it('should render nothing when no presets exist', () => {
      // Given (Arrange) - Keine Presets vorhanden
      mockUseFilterPresets.mockReturnValue([]);

      // When (Act)
      const { container } = render(<PresetBar />);

      // Then (Assert)
      expect(container.firstChild).toBeNull();
    });

    it('should render chips for all presets', () => {
      // Given (Arrange) - Zwei Presets vorhanden
      mockUseFilterPresets.mockReturnValue([presetMeine, presetLeitstelle]);

      // When (Act)
      render(<PresetBar />);

      // Then (Assert)
      expect(screen.getByText('Meine ueberfaelligen')).toBeInTheDocument();
      expect(screen.getByText('Leitstelle Geplant')).toBeInTheDocument();
    });

    it('should render multiple presets correctly', () => {
      // Given (Arrange) - Drei Presets vorhanden
      mockUseFilterPresets.mockReturnValue([presetMeine, presetLeitstelle, presetDritt]);

      // When (Act)
      render(<PresetBar />);

      // Then (Assert)
      expect(screen.getByText('Meine ueberfaelligen')).toBeInTheDocument();
      expect(screen.getByText('Leitstelle Geplant')).toBeInTheDocument();
      expect(screen.getByText('Drittes Preset')).toBeInTheDocument();
    });

    it('should display preset name in the chip', () => {
      // Given (Arrange) - Ein Preset mit spezifischem Namen
      mockUseFilterPresets.mockReturnValue([presetMeine]);

      // When (Act)
      render(<PresetBar />);

      // Then (Assert)
      const chipButton = screen.getByRole('button', { name: /Preset "Meine ueberfaelligen" aktivieren/i });
      expect(chipButton).toHaveTextContent('Meine ueberfaelligen');
    });
  });

  describe('active preset styling', () => {
    it('should apply highlighted classes for active preset (ring-2, bg-primary-50)', () => {
      // Given (Arrange) - Preset-1 ist aktiv und Filter stimmen ueberein
      mockUseFilterPresets.mockReturnValue([presetMeine]);
      mockUseActivePresetId.mockReturnValue('preset-1');
      mockIsPresetActive.mockReturnValue(true);

      // When (Act)
      const { container } = render(<PresetBar />);

      // Then (Assert) - Der Chip-Wrapper (span) hat aktive Klassen
      const chipSpan = container.querySelector('span');
      expect(chipSpan).toHaveClass('ring-2');
      expect(chipSpan).toHaveClass('bg-primary-50');
    });

    it('should apply default classes for inactive preset (bg-gray-100)', () => {
      // Given (Arrange) - Preset ist nicht aktiv
      mockUseFilterPresets.mockReturnValue([presetMeine]);
      mockUseActivePresetId.mockReturnValue(null);
      mockIsPresetActive.mockReturnValue(false);

      // When (Act)
      const { container } = render(<PresetBar />);

      // Then (Assert) - Der Chip-Wrapper (span) hat inaktive Klassen
      const chipSpan = container.querySelector('span');
      expect(chipSpan).toHaveClass('bg-gray-100');
      expect(chipSpan).not.toHaveClass('ring-2');
      expect(chipSpan).not.toHaveClass('bg-primary-50');
    });
  });

  describe('interaction', () => {
    it('should call applyPreset when chip is clicked', () => {
      // Given (Arrange) - Ein Preset vorhanden
      mockUseFilterPresets.mockReturnValue([presetMeine]);

      // When (Act) - Klick auf den Preset-Name-Button
      render(<PresetBar />);
      fireEvent.click(screen.getByRole('button', { name: /Preset "Meine ueberfaelligen" aktivieren/i }));

      // Then (Assert)
      expect(mockApplyPreset).toHaveBeenCalledTimes(1);
      expect(mockApplyPreset).toHaveBeenCalledWith(presetMeine);
    });

    it('should call removePreset when X button is clicked', () => {
      // Given (Arrange) - Ein Preset vorhanden
      mockUseFilterPresets.mockReturnValue([presetMeine]);

      // When (Act) - Klick auf den X-Button (loeschen)
      render(<PresetBar />);
      fireEvent.click(screen.getByRole('button', { name: /Preset "Meine ueberfaelligen" loeschen/i }));

      // Then (Assert)
      expect(mockRemovePreset).toHaveBeenCalledTimes(1);
      expect(mockRemovePreset).toHaveBeenCalledWith('preset-1');
    });
  });

  describe('accessibility & visibility', () => {
    it('should have aria-label on remove button for accessibility', () => {
      // Given (Arrange)
      mockUseFilterPresets.mockReturnValue([presetLeitstelle]);

      // When (Act)
      render(<PresetBar />);

      // Then (Assert)
      expect(screen.getByRole('button', { name: 'Preset "Leitstelle Geplant" loeschen' })).toBeInTheDocument();
    });

    it('should have remove button hidden by default (opacity-0)', () => {
      // Given (Arrange)
      mockUseFilterPresets.mockReturnValue([presetMeine]);

      // When (Act)
      render(<PresetBar />);

      // Then (Assert) - Der X-Button hat opacity-0 Klasse (sichtbar erst bei hover via group-hover)
      const removeButton = screen.getByRole('button', { name: /Preset "Meine ueberfaelligen" loeschen/i });
      expect(removeButton).toHaveClass('opacity-0');
    });

    it('should have toolbar role and aria-label on the container', () => {
      // Given (Arrange)
      mockUseFilterPresets.mockReturnValue([presetMeine]);

      // When (Act)
      render(<PresetBar />);

      // Then (Assert)
      expect(screen.getByRole('toolbar', { name: 'Filter-Presets' })).toBeInTheDocument();
    });
  });
});
