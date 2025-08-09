import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as tauriCore from '@tauri-apps/api/core';
import { useIsTauri } from './useIsTauri';
import { logger } from '@/utils/logger';

// Mock logger
vi.mock('@/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    log: vi.fn(),
  },
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  isTauri: vi.fn(),
}));

describe('useIsTauri', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when running in Tauri', () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(true);

    const { isTauri } = useIsTauri();

    expect(isTauri).toBe(true);
    expect(tauriCore.isTauri).toHaveBeenCalledOnce();
  });

  it('should return false when running in browser', () => {
    vi.mocked(tauriCore.isTauri).mockReturnValue(false);

    const { isTauri } = useIsTauri();

    expect(isTauri).toBe(false);
    expect(tauriCore.isTauri).toHaveBeenCalledOnce();
  });

  it('should handle errors gracefully and return false', () => {
    vi.mocked(tauriCore.isTauri).mockImplementation(() => {
      throw new Error('Tauri API not available');
    });
    const { isTauri } = useIsTauri();

    expect(isTauri).toBe(false);
    expect(vi.mocked(logger.debug)).toHaveBeenCalledWith(
      expect.any(Error),
      'Tauri API not available, falling back to browser mode',
    );
  });
});
