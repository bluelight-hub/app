import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearSelection,
  eigenschutzSelectionStore,
  enterMultiSelect,
  exitMultiSelect,
  isEinheitSelected,
  removeFromSelection,
  selectIsMultiSelectActive,
  selectSelectionCount,
  toggleSelection,
} from '../eigenschutz-selection.store';

const E1 = 'einheit-1';
const E2 = 'einheit-2';
const E3 = 'einheit-3';

describe('eigenschutzSelectionStore (Story 3.2)', () => {
  beforeEach(() => {
    clearSelection();
  });

  describe('enterMultiSelect', () => {
    it('aktiviert Multi-Select-Modus und initialisiert Selection mit Trigger-ID', () => {
      enterMultiSelect(E1);
      const state = eigenschutzSelectionStore.state;
      expect(state.mode).toBe('multi');
      expect([...state.selectedEinheitIds]).toEqual([E1]);
      expect(selectIsMultiSelectActive(state)).toBe(true);
      expect(selectSelectionCount(state)).toBe(1);
    });

    it('fügt im Multi-Modus weitere Einheiten hinzu, ohne die bestehende Selection zu wipen (F1)', () => {
      enterMultiSelect(E1);
      toggleSelection(E2);
      enterMultiSelect(E3);
      expect([...eigenschutzSelectionStore.state.selectedEinheitIds].sort()).toEqual([E1, E2, E3].sort());
    });

    it('ist idempotent im Multi-Modus, wenn die Trigger-ID bereits selektiert ist', () => {
      enterMultiSelect(E1);
      toggleSelection(E2);
      enterMultiSelect(E1);
      expect([...eigenschutzSelectionStore.state.selectedEinheitIds].sort()).toEqual([E1, E2].sort());
    });
  });

  describe('toggleSelection', () => {
    it('togglet im Multi-Modus die Einheit (add → remove → add)', () => {
      enterMultiSelect(E1);
      toggleSelection(E2);
      expect([...eigenschutzSelectionStore.state.selectedEinheitIds].sort()).toEqual([E1, E2]);
      toggleSelection(E2);
      expect([...eigenschutzSelectionStore.state.selectedEinheitIds]).toEqual([E1]);
      toggleSelection(E2);
      expect([...eigenschutzSelectionStore.state.selectedEinheitIds].sort()).toEqual([E1, E2]);
    });

    it('ist No-Op im Single-Modus (kein impliziter Wechsel zu Multi)', () => {
      toggleSelection(E1);
      const state = eigenschutzSelectionStore.state;
      expect(state.mode).toBe('single');
      expect(state.selectedEinheitIds.size).toBe(0);
    });

    it('schaltet auf Single zurück, wenn die letzte Einheit abgewählt wird', () => {
      enterMultiSelect(E1);
      toggleSelection(E1);
      const state = eigenschutzSelectionStore.state;
      expect(state.mode).toBe('single');
      expect(state.selectedEinheitIds.size).toBe(0);
    });
  });

  describe('removeFromSelection', () => {
    it('entfernt die Einheit, behält Multi-Modus solange Selection > 0', () => {
      enterMultiSelect(E1);
      toggleSelection(E2);
      removeFromSelection(E1);
      const state = eigenschutzSelectionStore.state;
      expect(state.mode).toBe('multi');
      expect([...state.selectedEinheitIds]).toEqual([E2]);
    });

    it('schaltet auf Single, wenn die letzte Einheit entfernt wird', () => {
      enterMultiSelect(E1);
      removeFromSelection(E1);
      expect(eigenschutzSelectionStore.state.mode).toBe('single');
    });

    it('ist No-Op, wenn die Einheit nicht in der Selection war', () => {
      enterMultiSelect(E1);
      removeFromSelection(E2);
      expect([...eigenschutzSelectionStore.state.selectedEinheitIds]).toEqual([E1]);
    });
  });

  describe('exitMultiSelect / clearSelection', () => {
    it('exitMultiSelect leert Selection und setzt Modus auf single', () => {
      enterMultiSelect(E1);
      toggleSelection(E2);
      exitMultiSelect();
      const state = eigenschutzSelectionStore.state;
      expect(state.mode).toBe('single');
      expect(state.selectedEinheitIds.size).toBe(0);
    });

    it('clearSelection ist Alias für leere Selection + single-Mode', () => {
      enterMultiSelect(E1);
      clearSelection();
      const state = eigenschutzSelectionStore.state;
      expect(state.mode).toBe('single');
      expect(state.selectedEinheitIds.size).toBe(0);
    });
  });

  describe('Selectors', () => {
    it('isEinheitSelected liefert korrekte Booleans', () => {
      enterMultiSelect(E1);
      toggleSelection(E3);
      const state = eigenschutzSelectionStore.state;
      expect(isEinheitSelected(state, E1)).toBe(true);
      expect(isEinheitSelected(state, E2)).toBe(false);
      expect(isEinheitSelected(state, E3)).toBe(true);
    });
  });
});
