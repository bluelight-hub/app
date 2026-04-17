import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useNeuerEtbEintragHotkey } from '../use-neuer-etb-eintrag-hotkey';

const mockUseHotkeys = vi.fn();
vi.mock('react-hotkeys-hook', () => ({
  useHotkeys: (...args: unknown[]) => mockUseHotkeys(...args),
}));

describe('useNeuerEtbEintragHotkey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registriert mod+shift+e mit Form-Tag-Freigabe und preventDefault', () => {
    renderHook(() => useNeuerEtbEintragHotkey({ onTrigger: vi.fn() }));

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'mod+shift+e',
      expect.any(Function),
      expect.objectContaining({
        enabled: true,
        enableOnFormTags: ['INPUT', 'TEXTAREA', 'SELECT'],
        preventDefault: true,
      }),
    );
  });

  it('ruft onTrigger auf und verhindert das Default-Verhalten', () => {
    const onTrigger = vi.fn();
    renderHook(() => useNeuerEtbEintragHotkey({ onTrigger }));

    const callback = mockUseHotkeys.mock.calls[0][1] as (event: { preventDefault: () => void }) => void;
    const event = { preventDefault: vi.fn() };
    callback(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(onTrigger).toHaveBeenCalledTimes(1);
  });

  it('respektiert die enabled-Option', () => {
    renderHook(() => useNeuerEtbEintragHotkey({ onTrigger: vi.fn(), enabled: false }));

    expect(mockUseHotkeys).toHaveBeenCalledWith(
      'mod+shift+e',
      expect.any(Function),
      expect.objectContaining({
        enabled: false,
      }),
    );
  });
});
