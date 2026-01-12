import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @tauri-apps/api/core
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(() => false),
}));

import { isTauri } from '@tauri-apps/api/core';
import { getPlatform } from '../platform';

describe('Platform Detection Utilities', () => {
  describe('getPlatform', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return "tauri" when running in Tauri environment', () => {
      // Given (Arrange)
      vi.mocked(isTauri).mockReturnValue(true);

      // When (Act)
      const result = getPlatform();

      // Then (Assert)
      expect(result).toBe('tauri');
    });

    it('should return "web" when running in web environment', () => {
      // Given (Arrange)
      vi.mocked(isTauri).mockReturnValue(false);

      // When (Act)
      const result = getPlatform();

      // Then (Assert)
      expect(result).toBe('web');
    });

    it('should call isTauri from @tauri-apps/api/core', () => {
      // Given (Arrange)
      vi.mocked(isTauri).mockReturnValue(false);

      // When (Act)
      getPlatform();

      // Then (Assert)
      expect(isTauri).toHaveBeenCalled();
    });
  });
});
