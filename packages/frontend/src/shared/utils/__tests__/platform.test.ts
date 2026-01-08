import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isTauri, getPlatform } from '../platform';

describe('Platform Detection Utilities', () => {
  describe('isTauri', () => {
    let originalTauri: unknown;

    beforeEach(() => {
      // Save original __TAURI__ if exists
      originalTauri = (window as any).__TAURI__;
    });

    afterEach(() => {
      // Restore original state
      if (originalTauri !== undefined) {
        (window as any).__TAURI__ = originalTauri;
      } else {
        delete (window as any).__TAURI__;
      }
    });

    it('should return true when __TAURI__ is present', () => {
      // Given (Arrange)
      (window as any).__TAURI__ = {};

      // When (Act)
      const result = isTauri();

      // Then (Assert)
      expect(result).toBe(true);
    });

    it('should return false when __TAURI__ is not present', () => {
      // Given (Arrange)
      delete (window as any).__TAURI__;

      // When (Act)
      const result = isTauri();

      // Then (Assert)
      expect(result).toBe(false);
    });

    it('should return false when window is undefined', () => {
      // Given (Arrange)
      const windowBackup = global.window;
      // @ts-expect-error - Testing edge case
      delete global.window;

      // When (Act)
      const result = isTauri();

      // Then (Assert)
      expect(result).toBe(false);

      // Cleanup
      global.window = windowBackup;
    });
  });

  describe('getPlatform', () => {
    let originalTauri: unknown;

    beforeEach(() => {
      originalTauri = (window as any).__TAURI__;
    });

    afterEach(() => {
      if (originalTauri !== undefined) {
        (window as any).__TAURI__ = originalTauri;
      } else {
        delete (window as any).__TAURI__;
      }
    });

    it('should return "tauri" when running in Tauri environment', () => {
      // Given (Arrange)
      (window as any).__TAURI__ = {};

      // When (Act)
      const result = getPlatform();

      // Then (Assert)
      expect(result).toBe('tauri');
    });

    it('should return "web" when running in web environment', () => {
      // Given (Arrange)
      delete (window as any).__TAURI__;

      // When (Act)
      const result = getPlatform();

      // Then (Assert)
      expect(result).toBe('web');
    });
  });
});
