/**
 * Filter-Preset Store Tests
 *
 * Test Pattern: AAA (Arrange-Act-Assert) mit Given-When-Then Kommentaren
 *
 * **Story 8.9 Task 1.7:**
 * - addPreset(): Preset wird hinzugefuegt, localStorage aktualisiert
 * - removePreset(): Preset wird entfernt, localStorage aktualisiert
 * - applyPreset(): Alle Filter-Stores werden korrekt gesetzt
 * - isPresetActive(): Erkennt aktives Preset, erkennt Nicht-Match
 * - loadFromLocalStorage(): Laedt gespeicherte Presets, handelt leeren/korrupten Storage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  addPreset,
  removePreset,
  applyPreset,
  resetFilterPresetStore,
  getFilterPresets,
  getActivePresetId,
  isPresetActive,
  reloadPresetsFromStorage,
  type FilterPresetType,
} from '@/features/reminders';
import { teamFilterStore, getTeamFilter, getTeamSort } from '../team-filter.store';
import { kategorieFilterStore, getKategorieFilter } from '@/features/reminders';
import { statusFilterStore, getStatusFilter, ErinnerungStatus } from '@/features/reminders';

describe('FilterPresetStore', () => {
  beforeEach(() => {
    // Reset alle Stores vor jedem Test
    resetFilterPresetStore();
    teamFilterStore.setState({
      selectedFilter: { type: 'all' },
      selectedSort: 'faelligkeit',
      availableTeilnehmer: [],
    });
    kategorieFilterStore.setState({
      selectedFilter: { type: 'all' },
    });
    statusFilterStore.setState({
      selectedFilter: { type: 'all' },
    });
    window.localStorage.clear();
  });

  describe('initial state', () => {
    it('should have empty presets array', () => {
      // Given (Arrange)
      resetFilterPresetStore();

      // When (Act)
      const presets = getFilterPresets();

      // Then (Assert)
      expect(presets).toEqual([]);
    });

    it('should have null activePresetId', () => {
      // Given (Arrange)
      resetFilterPresetStore();

      // When (Act)
      const activeId = getActivePresetId();

      // Then (Assert)
      expect(activeId).toBeNull();
    });
  });

  describe('addPreset()', () => {
    it('should add a preset to the store', () => {
      // Given (Arrange)
      const presetData = {
        name: 'Meine ueberfaelligen',
        teamFilter: { type: 'mine' as const },
        kategorieFilter: { type: 'all' as const },
        statusFilter: { type: 'all' as const },
        sortierung: 'faelligkeit' as const,
      };

      // When (Act)
      addPreset(presetData);

      // Then (Assert)
      const presets = getFilterPresets();
      expect(presets).toHaveLength(1);
      expect(presets[0].name).toBe('Meine ueberfaelligen');
      expect(presets[0].teamFilter).toEqual({ type: 'mine' });
      expect(presets[0].id).toBeDefined();
    });

    it('should generate unique IDs for each preset', () => {
      // Given (Arrange)
      const presetData = {
        name: 'Test',
        teamFilter: { type: 'all' as const },
        kategorieFilter: { type: 'all' as const },
        statusFilter: { type: 'all' as const },
        sortierung: 'faelligkeit' as const,
      };

      // When (Act)
      addPreset(presetData);
      addPreset({ ...presetData, name: 'Test 2' });

      // Then (Assert)
      const presets = getFilterPresets();
      expect(presets).toHaveLength(2);
      expect(presets[0].id).not.toBe(presets[1].id);
    });

    it('should persist to localStorage', () => {
      // Given (Arrange)
      const setItemSpy = vi.spyOn(window.localStorage, 'setItem');

      // When (Act)
      addPreset({
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });

      // Then (Assert)
      expect(setItemSpy).toHaveBeenCalledWith('bluelight-hub:filter-presets', expect.any(String));
      const stored = JSON.parse(window.localStorage.getItem('bluelight-hub:filter-presets') ?? '[]');
      expect(stored).toHaveLength(1);

      setItemSpy.mockRestore();
    });

    it('should preserve all filter types in preset', () => {
      // Given (Arrange)
      const presetData = {
        name: 'Komplex',
        teamFilter: { type: 'user' as const, userId: 'user-123' },
        kategorieFilter: { type: 'kategorie' as const, kategorieId: 'kat-456' },
        statusFilter: { type: 'status' as const, status: ErinnerungStatus.Geplant },
        sortierung: 'titel' as const,
      };

      // When (Act)
      addPreset(presetData);

      // Then (Assert)
      const presets = getFilterPresets();
      expect(presets[0].teamFilter).toEqual({ type: 'user', userId: 'user-123' });
      expect(presets[0].kategorieFilter).toEqual({ type: 'kategorie', kategorieId: 'kat-456' });
      expect(presets[0].statusFilter).toEqual({ type: 'status', status: ErinnerungStatus.Geplant });
      expect(presets[0].sortierung).toBe('titel');
    });
  });

  describe('removePreset()', () => {
    it('should remove a preset by ID', () => {
      // Given (Arrange)
      addPreset({
        name: 'Zu loeschen',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });
      const presetId = getFilterPresets()[0].id;

      // When (Act)
      removePreset(presetId);

      // Then (Assert)
      expect(getFilterPresets()).toHaveLength(0);
    });

    it('should update localStorage after removal', () => {
      // Given (Arrange)
      addPreset({
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });
      const presetId = getFilterPresets()[0].id;

      // When (Act)
      removePreset(presetId);

      // Then (Assert)
      const stored = JSON.parse(window.localStorage.getItem('bluelight-hub:filter-presets') ?? '[]');
      expect(stored).toHaveLength(0);
    });

    it('should reset activePresetId when active preset is removed (AC3)', () => {
      // Given (Arrange)
      addPreset({
        name: 'Aktiv',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });
      const preset = getFilterPresets()[0];
      applyPreset(preset);
      expect(getActivePresetId()).toBe(preset.id);

      // When (Act)
      removePreset(preset.id);

      // Then (Assert)
      expect(getActivePresetId()).toBeNull();
    });

    it('should not change activePresetId when a different preset is removed', () => {
      // Given (Arrange)
      addPreset({
        name: 'Aktiv',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });
      addPreset({
        name: 'Anderes',
        teamFilter: { type: 'mine' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });
      const presets = getFilterPresets();
      applyPreset(presets[0]);

      // When (Act)
      removePreset(presets[1].id);

      // Then (Assert)
      expect(getActivePresetId()).toBe(presets[0].id);
    });

    it('should handle removing non-existent preset gracefully', () => {
      // Given (Arrange)
      addPreset({
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      });

      // When (Act)
      removePreset('non-existent-id');

      // Then (Assert)
      expect(getFilterPresets()).toHaveLength(1);
    });
  });

  describe('applyPreset()', () => {
    it('should set all filter stores correctly (AC2)', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test-id',
        name: 'Test Preset',
        teamFilter: { type: 'mine' },
        kategorieFilter: { type: 'untagged' },
        statusFilter: { type: 'status', status: ErinnerungStatus.Geplant },
        sortierung: 'titel',
      };

      // When (Act)
      applyPreset(preset);

      // Then (Assert)
      expect(getTeamFilter()).toEqual({ type: 'mine' });
      expect(getKategorieFilter()).toEqual({ type: 'untagged' });
      expect(getStatusFilter()).toEqual({ type: 'status', status: ErinnerungStatus.Geplant });
      expect(getTeamSort()).toBe('titel');
    });

    it('should set activePresetId', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'preset-42',
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      };

      // When (Act)
      applyPreset(preset);

      // Then (Assert)
      expect(getActivePresetId()).toBe('preset-42');
    });

    it('should handle user filter type with userId', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'user-preset',
        name: 'Benutzer-Filter',
        teamFilter: { type: 'user', userId: 'user-xyz' },
        kategorieFilter: { type: 'kategorie', kategorieId: 'kat-abc' },
        statusFilter: { type: 'status', status: ErinnerungStatus.Eskaliert },
        sortierung: 'status',
      };

      // When (Act)
      applyPreset(preset);

      // Then (Assert)
      expect(getTeamFilter()).toEqual({ type: 'user', userId: 'user-xyz' });
      expect(getKategorieFilter()).toEqual({ type: 'kategorie', kategorieId: 'kat-abc' });
      expect(getStatusFilter()).toEqual({ type: 'status', status: ErinnerungStatus.Eskaliert });
      expect(getTeamSort()).toBe('status');
    });
  });

  describe('isPresetActive() (AC5)', () => {
    it('should return true when current filters match preset exactly', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test',
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      };
      // Alle Stores sind auf Default - passt zum Preset

      // When (Act)
      const result = isPresetActive(preset);

      // Then (Assert)
      expect(result).toBe(true);
    });

    it('should return false when team filter differs', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test',
        name: 'Test',
        teamFilter: { type: 'mine' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      };

      // When (Act)
      const result = isPresetActive(preset);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false when kategorie filter differs', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test',
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'untagged' },
        statusFilter: { type: 'all' },
        sortierung: 'faelligkeit',
      };

      // When (Act)
      const result = isPresetActive(preset);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false when status filter differs', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test',
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'status', status: ErinnerungStatus.Geplant },
        sortierung: 'faelligkeit',
      };

      // When (Act)
      const result = isPresetActive(preset);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false when sort differs', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test',
        name: 'Test',
        teamFilter: { type: 'all' },
        kategorieFilter: { type: 'all' },
        statusFilter: { type: 'all' },
        sortierung: 'titel',
      };

      // When (Act)
      const result = isPresetActive(preset);

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return true after applying preset', () => {
      // Given (Arrange)
      const preset: FilterPresetType = {
        id: 'test',
        name: 'Test',
        teamFilter: { type: 'mine' },
        kategorieFilter: { type: 'untagged' },
        statusFilter: { type: 'status', status: ErinnerungStatus.Erledigt },
        sortierung: 'erstellt',
      };

      // When (Act)
      applyPreset(preset);
      const result = isPresetActive(preset);

      // Then (Assert)
      expect(result).toBe(true);
    });
  });

  describe('localStorage Persistierung (AC4)', () => {
    it('should load presets from localStorage on reloadPresetsFromStorage', () => {
      // Given (Arrange)
      const presets: FilterPresetType[] = [
        {
          id: 'stored-1',
          name: 'Gespeichert',
          teamFilter: { type: 'mine' },
          kategorieFilter: { type: 'all' },
          statusFilter: { type: 'all' },
          sortierung: 'faelligkeit',
        },
      ];
      window.localStorage.setItem('bluelight-hub:filter-presets', JSON.stringify(presets));

      // When (Act)
      reloadPresetsFromStorage();

      // Then (Assert)
      const loaded = getFilterPresets();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Gespeichert');
    });

    it('should handle empty localStorage', () => {
      // Given (Arrange)
      window.localStorage.removeItem('bluelight-hub:filter-presets');

      // When (Act)
      reloadPresetsFromStorage();

      // Then (Assert)
      expect(getFilterPresets()).toEqual([]);
    });

    it('should handle corrupt localStorage data', () => {
      // Given (Arrange)
      window.localStorage.setItem('bluelight-hub:filter-presets', 'invalid-json{{{');

      // When (Act)
      reloadPresetsFromStorage();

      // Then (Assert)
      expect(getFilterPresets()).toEqual([]);
    });

    it('should filter out invalid preset objects from localStorage', () => {
      // Given (Arrange)
      const mixed = [
        { id: 'valid', name: 'OK', teamFilter: { type: 'all' }, kategorieFilter: { type: 'all' }, statusFilter: { type: 'all' }, sortierung: 'faelligkeit' },
        { id: 'invalid' }, // Missing required fields
        null,
        'string',
      ];
      window.localStorage.setItem('bluelight-hub:filter-presets', JSON.stringify(mixed));

      // When (Act)
      reloadPresetsFromStorage();

      // Then (Assert)
      const loaded = getFilterPresets();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('OK');
    });

    it('should handle non-array localStorage data', () => {
      // Given (Arrange)
      window.localStorage.setItem('bluelight-hub:filter-presets', JSON.stringify({ not: 'array' }));

      // When (Act)
      reloadPresetsFromStorage();

      // Then (Assert)
      expect(getFilterPresets()).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('should handle rapid add and remove operations', () => {
      // Given (Arrange)
      const base = {
        teamFilter: { type: 'all' as const },
        kategorieFilter: { type: 'all' as const },
        statusFilter: { type: 'all' as const },
        sortierung: 'faelligkeit' as const,
      };

      // When (Act)
      addPreset({ ...base, name: 'P1' });
      addPreset({ ...base, name: 'P2' });
      addPreset({ ...base, name: 'P3' });
      const presets = getFilterPresets();
      removePreset(presets[1].id); // Remove P2

      // Then (Assert)
      const remaining = getFilterPresets();
      expect(remaining).toHaveLength(2);
      expect(remaining[0].name).toBe('P1');
      expect(remaining[1].name).toBe('P3');
    });

    it('should maintain preset data integrity through localStorage roundtrip', () => {
      // Given (Arrange)
      const complexPreset = {
        name: 'Komplex',
        teamFilter: { type: 'user' as const, userId: 'u-123' },
        kategorieFilter: { type: 'kategorie' as const, kategorieId: 'k-456' },
        statusFilter: { type: 'status' as const, status: ErinnerungStatus.Ausgeloest },
        sortierung: 'status' as const,
      };

      // When (Act)
      addPreset(complexPreset);
      const originalPresets = getFilterPresets();
      resetFilterPresetStore();
      reloadPresetsFromStorage();

      // Then (Assert)
      const loadedPresets = getFilterPresets();
      expect(loadedPresets).toHaveLength(1);
      expect(loadedPresets[0].name).toBe(originalPresets[0].name);
      expect(loadedPresets[0].teamFilter).toEqual(originalPresets[0].teamFilter);
      expect(loadedPresets[0].kategorieFilter).toEqual(originalPresets[0].kategorieFilter);
      expect(loadedPresets[0].statusFilter).toEqual(originalPresets[0].statusFilter);
      expect(loadedPresets[0].sortierung).toBe(originalPresets[0].sortierung);
    });

    it('should handle localStorage quota errors gracefully', () => {
      // Given (Arrange)
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('QuotaExceededError');
      });

      // When (Act) - Should not throw
      expect(() => {
        addPreset({
          name: 'Test',
          teamFilter: { type: 'all' },
          kategorieFilter: { type: 'all' },
          statusFilter: { type: 'all' },
          sortierung: 'faelligkeit',
        });
      }).not.toThrow();

      // Then (Assert) - Preset should still be in store
      expect(getFilterPresets()).toHaveLength(1);

      setItemSpy.mockRestore();
    });
  });
});
