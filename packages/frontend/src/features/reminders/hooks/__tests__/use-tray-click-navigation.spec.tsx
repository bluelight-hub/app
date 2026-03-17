import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListen = vi.fn();
const mockNavigate = vi.fn();
const mockLogger = {
  info: vi.fn(),
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

let mockTriggeredIds: string[] = [];
let mockIsTauri = true;
let trayClickCallback: (() => void) | undefined;

vi.mock('@tauri-apps/api/event', () => ({
  listen: mockListen,
}));

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => mockIsTauri,
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: mockLogger,
}));

vi.mock('../../stores/timer.store', () => ({
  useTriggeredTimerIds: () => mockTriggeredIds,
}));

describe('useTrayClickNavigation', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockTriggeredIds = [];
    mockIsTauri = true;
    trayClickCallback = undefined;
    mockListen.mockImplementation(async (_event: string, callback: () => void) => {
      trayClickCallback = callback;
      return vi.fn();
    });
  });

  it('registriert den Tray-Listener nur einmal über mehrere Hook-Instanzen', async () => {
    const { useTrayClickNavigation } = await import('../use-tray-click-navigation');

    renderHook(() => useTrayClickNavigation('einsatz-1'));
    renderHook(() => useTrayClickNavigation('einsatz-1'));

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledTimes(1);
    });
  });

  it('navigiert mit den neuesten ausgelösten Erinnerungen ohne Neu-Registrierung', async () => {
    const { useTrayClickNavigation } = await import('../use-tray-click-navigation');

    const { rerender } = renderHook(({ einsatzId }: { einsatzId: string | undefined }) => useTrayClickNavigation(einsatzId), {
      initialProps: { einsatzId: 'einsatz-1' },
    });

    await waitFor(() => {
      expect(mockListen).toHaveBeenCalledTimes(1);
    });

    mockTriggeredIds = ['erinnerung-42'];

    rerender({ einsatzId: 'einsatz-1' });

    expect(mockListen).toHaveBeenCalledTimes(1);

    act(() => {
      trayClickCallback?.();
    });

    expect(mockNavigate).toHaveBeenCalledWith({
      to: '/einsatz/$einsatzId/erinnerungen',
      params: { einsatzId: 'einsatz-1' },
      search: { highlight: 'erinnerung-42' },
    });
  });

  it('registriert im Browser keinen Tray-Listener', async () => {
    mockIsTauri = false;
    const { useTrayClickNavigation } = await import('../use-tray-click-navigation');

    renderHook(() => useTrayClickNavigation('einsatz-1'));

    expect(mockListen).not.toHaveBeenCalled();
  });
});
