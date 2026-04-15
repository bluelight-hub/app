import { describe, expect, it, vi } from 'vitest';

const toastCustom = vi.fn();
vi.mock('sonner', () => ({
  toast: { custom: (...args: unknown[]) => toastCustom(...args) },
}));

import { showNotfallAlertToast } from '../NotfallAlertToast.molecule';

describe('showNotfallAlertToast', () => {
  it('ruft toast.custom mit Render-Funktion + 10s-Duration + deterministischer ID auf', () => {
    showNotfallAlertToast({
      einsatzId: 'e1',
      kanalId: 'k1',
      kanalName: 'Rettung 1',
      text: 'Mayday',
      absender: 'RK 83/1',
      empfaenger: 'LST',
      ereignisZeitpunkt: '2026-04-15T12:00:00.000Z',
    });

    expect(toastCustom).toHaveBeenCalledTimes(1);
    const [renderFn, options] = toastCustom.mock.calls[0];
    expect(typeof renderFn).toBe('function');
    expect(options).toEqual({ duration: 10_000, id: 'notfall:e1:2026-04-15T12:00:00.000Z' });
  });
});
