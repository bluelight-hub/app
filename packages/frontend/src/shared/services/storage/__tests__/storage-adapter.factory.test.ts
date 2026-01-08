import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IStoragePort } from '@/shared/types/storage';
import * as platformUtils from '@/shared/utils/platform';
import { getStorageAdapter, resetStorageAdapter } from '../storage-adapter.factory';
import { TauriStorageAdapter } from '../tauri-storage-adapter';
import { WebStorageAdapter } from '../web-storage-adapter';

describe('Storage Adapter Factory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetStorageAdapter(); // Singleton zurücksetzen vor jedem Test
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Platform Detection', () => {
    it('should return TauriStorageAdapter instance on Tauri platform', () => {
      // Given: Tauri Platform
      vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('tauri');

      // When: Factory wird aufgerufen
      const adapter = getStorageAdapter();

      // Then: TauriStorageAdapter wird geliefert
      expect(adapter).toBeInstanceOf(TauriStorageAdapter);
    });

    it('should return WebStorageAdapter instance on Web platform', () => {
      // Given: Web Platform
      vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('web');

      // When: Factory wird aufgerufen
      const adapter = getStorageAdapter();

      // Then: WebStorageAdapter wird geliefert
      expect(adapter).toBeInstanceOf(WebStorageAdapter);
    });
  });

  describe('Singleton Behavior', () => {
    it('should return same instance on multiple calls', () => {
      // Given: Tauri Platform
      vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('tauri');

      // When: Factory mehrfach aufgerufen
      const adapter1 = getStorageAdapter();
      const adapter2 = getStorageAdapter();
      const adapter3 = getStorageAdapter();

      // Then: Alle Referenzen sind identisch
      expect(adapter1).toBe(adapter2);
      expect(adapter2).toBe(adapter3);
    });

    it('should call getPlatform() only once for singleton', () => {
      // Given: Tauri Platform
      const getPlatformSpy = vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('tauri');

      // When: Factory mehrfach aufgerufen
      getStorageAdapter();
      getStorageAdapter();
      getStorageAdapter();

      // Then: getPlatform() nur beim ersten Call
      expect(getPlatformSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('resetStorageAdapter()', () => {
    it('should invalidate singleton and create new instance', () => {
      // Given: Singleton existiert
      vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('tauri');
      const firstAdapter = getStorageAdapter();

      // When: Reset + neuer Call
      resetStorageAdapter();
      const secondAdapter = getStorageAdapter();

      // Then: Neue Instanz (nicht identisch)
      expect(firstAdapter).toBeInstanceOf(TauriStorageAdapter);
      expect(secondAdapter).toBeInstanceOf(TauriStorageAdapter);
      expect(firstAdapter).not.toBe(secondAdapter);
    });

    it('should allow platform switch after reset', () => {
      // Given: Tauri Adapter
      const getPlatformSpy = vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('tauri');
      const tauriAdapter = getStorageAdapter();
      expect(tauriAdapter).toBeInstanceOf(TauriStorageAdapter);

      // When: Reset + Platform Switch
      resetStorageAdapter();
      getPlatformSpy.mockReturnValue('web');
      const webAdapter = getStorageAdapter();

      // Then: Neuer Adapter-Typ
      expect(webAdapter).toBeInstanceOf(WebStorageAdapter);
      expect(webAdapter).not.toBe(tauriAdapter);
    });

    it('should call getPlatform() again after reset', () => {
      // Given: Singleton existiert
      const getPlatformSpy = vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('tauri');
      getStorageAdapter();
      expect(getPlatformSpy).toHaveBeenCalledTimes(1);

      // When: Reset + neuer Call
      resetStorageAdapter();
      getStorageAdapter();

      // Then: getPlatform() erneut aufgerufen
      expect(getPlatformSpy).toHaveBeenCalledTimes(2);
    });
  });

  describe('Type Safety', () => {
    it('should return object implementing IStoragePort interface', () => {
      // Given: Web Platform
      vi.spyOn(platformUtils, 'getPlatform').mockReturnValue('web');

      // When: Factory wird aufgerufen
      const adapter = getStorageAdapter();

      // Then: IStoragePort Interface erfüllt
      const storagePort: IStoragePort = adapter; // TypeScript Typcheck
      expect(storagePort.getItem).toBeDefined();
      expect(storagePort.setItem).toBeDefined();
      expect(storagePort.removeItem).toBeDefined();
      expect(storagePort.clear).toBeDefined();
    });
  });
});
