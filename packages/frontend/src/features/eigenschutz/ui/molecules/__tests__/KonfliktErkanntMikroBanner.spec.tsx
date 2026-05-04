/**
 * Tests für `KonfliktErkanntMikroBanner` (Story 3.9 AC8).
 *
 * Pattern: 1:1 zu `EinsatzleiterReprompEskalationBanner.spec.tsx`.
 */
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rolleMock, einheitenMock } = vi.hoisted(() => ({
  rolleMock: { data: { rolle: 'BEFEHLSGEBER', permissions: {} } as { rolle: string | null; permissions: unknown } | undefined },
  einheitenMock: { data: undefined as Array<{ id: string; name: string }> | undefined },
}));

vi.mock('@/features/befehl/api/use-my-einsatz-rolle', () => ({
  useMyEinsatzRolle: () => rolleMock,
}));

vi.mock('@/features/kraefte/api/use-einsatz-einheiten', () => ({
  useEinsatzEinheiten: () => einheitenMock,
}));

import { KonfliktErkanntMikroBanner } from '../KonfliktErkanntMikroBanner';
import type { KonfliktNotice } from '../../../api/use-eigenschutz-konflikt-erkannt-live';

const makeNotice = (overrides: Partial<KonfliktNotice> = {}): KonfliktNotice => ({
  eventId: 'evt-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  entityType: 'PSA_PROFIL_ZUWEISUNG',
  entityId: 'zuweisung-1',
  fieldPath: 'profil',
  serverVersion: 6,
  localExpectedVersion: 5,
  reportedByUserId: 'user-loser',
  occurredAt: '2026-05-04T10:00:00.000Z',
  receivedAt: Date.now(),
  ...overrides,
});

beforeEach(() => {
  rolleMock.data = { rolle: 'BEFEHLSGEBER', permissions: {} };
  einheitenMock.data = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('KonfliktErkanntMikroBanner (Story 3.9 AC8)', () => {
  it('rendert null, wenn Rolle !== BEFEHLSGEBER (Sichtbarkeits-Filter)', () => {
    rolleMock.data = { rolle: 'EMPFAENGER', permissions: {} };
    const { container } = render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert null, wenn keine Notices vorliegen', () => {
    const { container } = render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={[]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert Banner mit Headline „Sync-Konflikt auf Abschnitt … – jetzt auflösen" (Epic-AC)', () => {
    einheitenMock.data = [{ id: 'einheit-1', name: 'Abschnitt A' }];
    render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} />);
    expect(screen.getByText(/Sync-Konflikt auf Abschnitt Abschnitt A.*jetzt auflösen/)).toBeInTheDocument();
  });

  it('Primary-Action „Konflikte ansehen" trägt data-testid="konflikt-banner-open" + ruft onOpenConflict (Story-3.10-Stub)', () => {
    const onOpen = vi.fn();
    render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} onOpenConflict={onOpen} />);
    expect(screen.getByTestId('konflikt-banner-open')).toBeInTheDocument();
    fireEvent.click(screen.getByText(/Konflikte ansehen/));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('Secondary-Action „Schließen" ruft onDismiss mit eventId', () => {
    const onDismiss = vi.fn();
    render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText(/Schließen/));
    expect(onDismiss).toHaveBeenCalledWith('evt-1');
  });

  it('Auto-Dismiss nach 30s', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    const recentNotice = makeNotice({ receivedAt: Date.now() });
    render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={[recentNotice]} onDismiss={onDismiss} />);
    vi.advanceTimersByTime(30_001);
    expect(onDismiss).toHaveBeenCalledWith('evt-1');
    vi.useRealTimers();
  });

  it('Soft-Cap MAX_VISIBLE=5: 6 Notices → 5 sichtbar + Overflow-Banner', () => {
    const notices = Array.from({ length: 6 }, (_, i) => makeNotice({ eventId: `evt-${i}` }));
    render(<KonfliktErkanntMikroBanner einsatzId="einsatz-1" notices={notices} onDismiss={vi.fn()} />);
    expect(screen.getAllByTestId('konflikt-banner-open')).toHaveLength(5);
    expect(screen.getByTestId('konflikt-erkannt-overflow')).toBeInTheDocument();
  });
});
