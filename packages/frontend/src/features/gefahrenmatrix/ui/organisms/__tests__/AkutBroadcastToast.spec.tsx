import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const navigateMock = vi.fn();
vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return { ...actual, useNavigate: () => navigateMock };
});

import { AkutBroadcastToast } from '../AkutBroadcastToast';
import { akutBroadcastActions, akutBroadcastStore } from '../../../stores/akut-broadcast.store';

function renderWithRouter() {
  return render(<AkutBroadcastToast />);
}

describe('AkutBroadcastToast', () => {
  beforeEach(() => {
    akutBroadcastActions.clearAll();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  it('rendert Stage-1 Toast direkt beim Push', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'leiter1' });
    renderWithRouter();
    const toast = screen.getByText(/AKUT:/);
    expect(toast).toBeInTheDocument();
    expect(screen.getByText(/Menschen|MENSCHEN/)).toBeInTheDocument();
  });

  it('eskaliert toast → persistent nach 10s via Timer', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u' });
    renderWithRouter();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(akutBroadcastStore.state.activeAlerts[0].stage).toBe('persistent');
  });

  it('eskaliert persistent → banner nach weiteren 20s (insgesamt 30s)', () => {
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u' });
    renderWithRouter();
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(akutBroadcastStore.state.activeAlerts[0].stage).toBe('banner');
    const banner = screen.getByRole('alert');
    expect(within(banner).getByText(/AKUT-Broadcast aktiv/)).toBeInTheDocument();
  });

  it('dismiss-Button entfernt den Alert', async () => {
    vi.useRealTimers();
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u' });
    const user = userEvent.setup();
    renderWithRouter();
    const closeBtn = screen.getByRole('button', { name: /AKUT-Toast schließen/i });
    await user.click(closeBtn);
    expect(akutBroadcastStore.state.activeAlerts).toHaveLength(0);
  });

  it('Sound-Toggle im Banner toggelt den Store', async () => {
    vi.useRealTimers();
    akutBroadcastActions.setSoundEnabled(true);
    akutBroadcastActions.pushAlert({ id: 'a1', einsatzId: 'e1', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN', aktualisiertVon: 'u' });
    akutBroadcastActions.escalateAlert('a1'); // persistent
    akutBroadcastActions.escalateAlert('a1'); // banner
    const user = userEvent.setup();
    renderWithRouter();
    const toggle = screen.getByRole('button', { name: /AKUT-Sound ausschalten/i });
    await user.click(toggle);
    expect(akutBroadcastStore.state.soundEnabled).toBe(false);
  });
});
