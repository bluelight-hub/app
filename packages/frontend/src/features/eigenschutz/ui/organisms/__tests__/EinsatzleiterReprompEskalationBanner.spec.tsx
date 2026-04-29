/**
 * Tests für `EinsatzleiterReprompEskalationBanner` (Story 3.7 AC8).
 *
 * Mockt `useMyEinsatzRolle` + `@tanstack/react-router` und prüft:
 * - Rolle-Gating (BEFEHLSGEBER → render, sonst null).
 * - Soft-Cap MAX_VISIBLE=5 + Sammel-Banner für Overflow.
 * - Primary-Action navigiert; Secondary-Action ruft onDismiss.
 * - A11y: role="status", aria-live="polite".
 */

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { rolleMock, navigateMock, einheitenMock } = vi.hoisted(() => ({
  rolleMock: { data: { rolle: 'BEFEHLSGEBER', permissions: {} } as { rolle: string | null; permissions: unknown } | undefined },
  navigateMock: vi.fn(),
  einheitenMock: { data: undefined as Array<{ id: string; name: string }> | undefined },
}));

vi.mock('@/features/befehl/api/use-my-einsatz-rolle', () => ({
  useMyEinsatzRolle: () => rolleMock,
}));

vi.mock('@/features/kraefte/api/use-einsatz-einheiten', () => ({
  useEinsatzEinheiten: () => einheitenMock,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { EinsatzleiterReprompEskalationBanner } from '../EinsatzleiterReprompEskalationBanner';
import type { QuittungUeberfaelligEventNotice } from '../../../api/use-eigenschutz-quittung-ueberfaellig-live';

const makeNotice = (overrides: Partial<QuittungUeberfaelligEventNotice> = {}): QuittungUeberfaelligEventNotice => ({
  propagationGroupId: 'group-A',
  einheitId: 'einheit-1',
  ueberfaelligSeitMin: 6,
  occurredAt: '2026-04-29T10:00:00.000Z',
  zuweisungId: null,
  ...overrides,
});

beforeEach(() => {
  rolleMock.data = { rolle: 'BEFEHLSGEBER', permissions: {} };
  einheitenMock.data = undefined;
  navigateMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('EinsatzleiterReprompEskalationBanner (Story 3.7 AC8)', () => {
  it('rendert null, wenn Rolle !== BEFEHLSGEBER (z. B. EMPFAENGER)', () => {
    rolleMock.data = { rolle: 'EMPFAENGER', permissions: {} };

    const { container } = render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert null, wenn keine Notices vorliegen', () => {
    const { container } = render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert für BEFEHLSGEBER + 1 Notice einen polite-Banner ohne verschachtelte Live-Region', () => {
    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} />);

    // Wrapper ist `role="region"` mit `aria-label` — KEIN eigenes `aria-live`,
    // sonst hätten wir eine verschachtelte Live-Region (innere Banner haben
    // bereits `role="status" aria-live="polite"`).
    const wrapper = screen.getByTestId('einsatzleiter-reprompt-eskalation');
    expect(wrapper).toHaveAttribute('role', 'region');
    expect(wrapper).toHaveAttribute('aria-label');
    expect(wrapper).not.toHaveAttribute('aria-live');

    const banner = screen.getByTestId('einsatzleiter-reprompt-eskalation-banner-group-A');
    expect(banner).toHaveAttribute('data-variant', 'warning');
    expect(banner).toHaveAttribute('aria-live', 'polite');
    expect(banner).toHaveTextContent('Quittung für Abschnitt');
    expect(banner).toHaveTextContent('seit 6 Minuten');
  });

  it('nutzt Klartext-einheitName aus dem useEinsatzEinheiten-Cache (AC8)', () => {
    einheitenMock.data = [{ id: 'einheit-1', name: 'Sani-Trupp 4' }];
    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} />);

    const banner = screen.getByTestId('einsatzleiter-reprompt-eskalation-banner-group-A');
    expect(banner).toHaveTextContent('Quittung für Sani-Trupp 4 überfällig');
  });

  it('fallt bei Cache-Miss auf einen redact-id-ähnlichen Hash zurück', () => {
    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[makeNotice({ einheitId: 'einheit-12345abcd' })]} onDismiss={vi.fn()} />);

    const banner = screen.getByTestId('einsatzleiter-reprompt-eskalation-banner-group-A');
    expect(banner).toHaveTextContent(/Quittung für Abschnitt einh…abcd überfällig/);
  });

  it('begrenzt auf MAX_VISIBLE=5 und rendert Sammel-Banner für Overflow (6 Einträge)', () => {
    const notices = Array.from({ length: 6 }, (_, i) => makeNotice({ propagationGroupId: `group-${i}`, einheitId: `einheit-${i}`, ueberfaelligSeitMin: 5 + i }));

    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={notices} onDismiss={vi.fn()} />);

    const banners = screen.getAllByTestId(/einsatzleiter-reprompt-eskalation-banner-group-/);
    expect(banners).toHaveLength(5);
    const overflow = screen.getByTestId('einsatzleiter-reprompt-eskalation-overflow');
    expect(overflow).toHaveTextContent('+ 1 weitere überfällige Quittung');
  });

  it('Sammel-Banner-Plural bei 2+ Overflow', () => {
    const notices = Array.from({ length: 7 }, (_, i) => makeNotice({ propagationGroupId: `group-${i}`, einheitId: `einheit-${i}` }));

    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={notices} onDismiss={vi.fn()} />);

    expect(screen.getByTestId('einsatzleiter-reprompt-eskalation-overflow')).toHaveTextContent('+ 2 weitere überfällige Quittungen');
  });

  it('Primary-Action „Im Dashboard öffnen" navigiert mit Hash auf PsaProfilePage', () => {
    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-42" notices={[makeNotice()]} onDismiss={vi.fn()} />);

    const banner = screen.getByTestId('einsatzleiter-reprompt-eskalation-banner-group-A');
    fireEvent.click(within(banner).getByRole('button', { name: 'Im Dashboard öffnen' }));

    expect(navigateMock).toHaveBeenCalledWith({
      to: '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile',
      params: { einsatzId: 'einsatz-42' },
      hash: 'luecke-group-A',
    });
  });

  it('Secondary-Action „Schließen" ruft onDismiss(propagationGroupId, einheitId)', () => {
    const onDismiss = vi.fn();
    render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={onDismiss} />);

    const banner = screen.getByTestId('einsatzleiter-reprompt-eskalation-banner-group-A');
    fireEvent.click(within(banner).getByRole('button', { name: 'Schließen' }));

    expect(onDismiss).toHaveBeenCalledWith('group-A', 'einheit-1');
  });

  it('rendert null, wenn rolle.data nicht geladen ist (defensive — Loading-State)', () => {
    rolleMock.data = undefined;

    const { container } = render(<EinsatzleiterReprompEskalationBanner einsatzId="einsatz-1" notices={[makeNotice()]} onDismiss={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
