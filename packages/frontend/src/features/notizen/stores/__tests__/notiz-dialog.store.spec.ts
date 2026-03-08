import { describe, it, expect, beforeEach } from 'vitest';
import { notizDialogStore, openQuickCreateNotizDialog, closeQuickCreateNotizDialog, resetNotizDialogStore } from '@/features/notizen';

describe('notiz-dialog.store', () => {
  beforeEach(() => {
    resetNotizDialogStore();
  });

  describe('openQuickCreateNotizDialog', () => {
    it('should set isQuickCreateOpen to true and store einsatzId', () => {
      // Given
      const einsatzId = 'einsatz-123';

      // When
      openQuickCreateNotizDialog(einsatzId);

      // Then
      const state = notizDialogStore.state;
      expect(state.isQuickCreateOpen).toBe(true);
      expect(state.einsatzId).toBe(einsatzId);
    });
  });

  describe('closeQuickCreateNotizDialog', () => {
    it('should set isQuickCreateOpen to false and keep einsatzId', () => {
      // Given
      openQuickCreateNotizDialog('einsatz-123');

      // When
      closeQuickCreateNotizDialog();

      // Then
      const state = notizDialogStore.state;
      expect(state.isQuickCreateOpen).toBe(false);
      expect(state.einsatzId).toBe('einsatz-123');
    });
  });

  describe('resetNotizDialogStore', () => {
    it('should reset all state to initial values', () => {
      // Given
      openQuickCreateNotizDialog('einsatz-123');

      // When
      resetNotizDialogStore();

      // Then
      const state = notizDialogStore.state;
      expect(state.isQuickCreateOpen).toBe(false);
      expect(state.einsatzId).toBeNull();
    });
  });

  describe('rapid open/close sequences', () => {
    it('should handle rapid open/close without state corruption', () => {
      // Given / When
      openQuickCreateNotizDialog('einsatz-1');
      closeQuickCreateNotizDialog();
      openQuickCreateNotizDialog('einsatz-2');

      // Then
      const state = notizDialogStore.state;
      expect(state.isQuickCreateOpen).toBe(true);
      expect(state.einsatzId).toBe('einsatz-2');
    });
  });
});
