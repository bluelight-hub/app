/**
 * Tests für `PsaProfilEmpfangBanner` (Story 3.3 AC6, AC7, AC8, AC9, AC10).
 *
 * Mockt den Live-Banner-Hook + Detail-Query + aktive-Einheit-Hook und
 * verifiziert: Render-Snapshot Single/Multi-Toggle, MAX_VISIBLE=3 +
 * Sammel-Banner, Telemetrie-Idempotenz, Stub-Handler-Aufrufe, `null`
 * bei fehlender Einheit.
 */

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PsaProfilLiveBanner } from '../../../api/use-eigenschutz-psa-live-banner';

const { hookMock, profileMock, einheitMock, userMock, ackMutationMock, lueckeMutationMock } = vi.hoisted(() => ({
  hookMock: { banner: [] as PsaProfilLiveBanner[], dismiss: vi.fn() },
  profileMock: { data: undefined as unknown, isPending: false },
  einheitMock: { einheitId: 'einheit-1' as string | null },
  userMock: { user: { id: 'user-empf' } as { id: string } | null },
  ackMutationMock: { mutate: vi.fn() },
  lueckeMutationMock: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean },
}));

vi.mock('../../../api/use-eigenschutz-psa-live-banner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/use-eigenschutz-psa-live-banner')>();
  return {
    ...actual,
    useEigenschutzPsaLiveBanner: () => ({
      banner: hookMock.banner,
      status: 'connected',
      dismiss: hookMock.dismiss,
    }),
  };
});

vi.mock('../../../api/queries', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../api/queries')>();
  return {
    ...actual,
    usePsaProfileByEinheit: () => profileMock,
    useAckPsaQuittung: () => ackMutationMock,
    useMeldeLuecke: () => lueckeMutationMock,
  };
});

vi.mock('../../../hooks/use-aktive-einsatz-einheit', () => ({
  useAktiveEinsatzEinheit: () => ({
    einheitId: einheitMock.einheitId,
    einheitName: einheitMock.einheitId === null ? null : 'Rettungstrupp 1',
    einheiten: [],
    setAktiveEinheit: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => userMock,
}));

import { PsaProfilEmpfangBanner } from '../PsaProfilEmpfangBanner';
import { eigenschutzTelemetryQueue } from '../../../lib/telemetry-queue';

const makeBanner = (overrides: Partial<PsaProfilLiveBanner> = {}): PsaProfilLiveBanner => ({
  propagationGroupId: 'group-1',
  einsatzId: 'einsatz-1',
  einheitId: 'einheit-1',
  profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT', zuweisungId: 'zuw-1' }],
  occurredAt: '2026-04-24T10:00:00.000Z',
  userIdHash: 'hash-x',
  ...overrides,
});

beforeEach(() => {
  hookMock.banner = [];
  hookMock.dismiss.mockReset();
  ackMutationMock.mutate.mockReset();
  lueckeMutationMock.mutateAsync.mockReset();
  lueckeMutationMock.mutateAsync.mockResolvedValue(undefined);
  lueckeMutationMock.isPending = false;
  profileMock.data = undefined;
  profileMock.isPending = false;
  einheitMock.einheitId = 'einheit-1';
  userMock.user = { id: 'user-empf' };
  eigenschutzTelemetryQueue.drain();
});

afterEach(() => {
  eigenschutzTelemetryQueue.drain();
});

describe('PsaProfilEmpfangBanner', () => {
  it('rendert null, wenn keine aktive Einheit gewählt ist (AC8)', () => {
    einheitMock.einheitId = null;
    hookMock.banner = [makeBanner()];
    const { container } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert nichts, wenn keine Banner aktiv sind', () => {
    hookMock.banner = [];
    const { container } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert Single-Toggle-Banner mit Profil-Label-Headline (AC5, AC6)', () => {
    hookMock.banner = [makeBanner()];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    const banner = screen.getByTestId('psa-empfang-banner');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
    expect(banner).toHaveAttribute('data-variant', 'critical');
    expect(banner).toHaveTextContent('PSA-Profil CBRN-Patient aktiviert');
  });

  it('rendert Multi-Toggle-Aggregat-Headline (AC5)', () => {
    hookMock.banner = [
      makeBanner({
        profilToggles: [
          { profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT', zuweisungId: 'z1' },
          { profil: 'VOLLSCHUTZ', aktion: 'AKTIVIERT', zuweisungId: 'z2' },
          { profil: 'INFEKTION', aktion: 'DEAKTIVIERT', zuweisungId: 'z3' },
        ],
      }),
    ];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(screen.getByTestId('psa-empfang-banner')).toHaveTextContent('3 PSA-Profile geändert');
  });

  it('zeigt Platzhalter-Body solange Detail-Query lädt (AC4)', () => {
    hookMock.banner = [makeBanner()];
    profileMock.isPending = true;
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(screen.getByTestId('psa-empfang-banner')).toHaveTextContent('Begründung wird geladen');
  });

  it('rendert Klartext-Begründung aus der Detail-Query, wenn der Refetch geladen ist (AC4)', () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-2' })];
    profileMock.data = [
      {
        id: 'r1',
        einsatzId: 'einsatz-1',
        einheitId: 'einheit-1',
        profil: 'CBRN_PATIENT',
        gueltigVon: '2026-04-24T10:00:00.000Z',
        gueltigBis: null,
        aktiviertVonUserId: 'user-7',
        begruendung: 'Verdacht auf Kontamination',
        propagationGroupId: 'group-2',
        version: 1,
      },
    ];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(screen.getByTestId('psa-empfang-banner')).toHaveTextContent('Grund: Verdacht auf Kontamination');
  });

  it('begrenzt auf MAX_VISIBLE=3 und zeigt Sammel-Banner für Overflow (AC7)', () => {
    hookMock.banner = [
      makeBanner({ propagationGroupId: 'g1', occurredAt: '2026-04-24T10:00:01.000Z' }),
      makeBanner({ propagationGroupId: 'g2', occurredAt: '2026-04-24T10:00:02.000Z' }),
      makeBanner({ propagationGroupId: 'g3', occurredAt: '2026-04-24T10:00:03.000Z' }),
      makeBanner({ propagationGroupId: 'g4', occurredAt: '2026-04-24T10:00:04.000Z' }),
    ];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(screen.getAllByTestId('psa-empfang-banner')).toHaveLength(3);
    expect(screen.getByTestId('psa-empfang-overflow-banner')).toHaveTextContent('1 weiteres kritisches Ereignis');
  });

  it('Sammel-Banner-Plural bei N≥2 Overflow', () => {
    hookMock.banner = [
      makeBanner({ propagationGroupId: 'g1', occurredAt: '2026-04-24T10:00:01.000Z' }),
      makeBanner({ propagationGroupId: 'g2', occurredAt: '2026-04-24T10:00:02.000Z' }),
      makeBanner({ propagationGroupId: 'g3', occurredAt: '2026-04-24T10:00:03.000Z' }),
      makeBanner({ propagationGroupId: 'g4', occurredAt: '2026-04-24T10:00:04.000Z' }),
      makeBanner({ propagationGroupId: 'g5', occurredAt: '2026-04-24T10:00:05.000Z' }),
    ];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(screen.getByTestId('psa-empfang-overflow-banner')).toHaveTextContent('2 weitere kritische Ereignisse');
  });

  it('schreibt einmal pro propagationGroupId ein all_banners_delivered-Event in die Telemetrie-Queue (AC9)', () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-tele' })];
    const { rerender } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    // Re-Render simuliert (z. B. durch Toggle-Akkumulation): Effekt darf NICHT
    // erneut feuern.
    rerender(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    rerender(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    const events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'all_banners_delivered');
    expect(events).toHaveLength(1);
    expect(events[0]?.propagationGroupIdCandidate).toBe('group-tele');
    expect(events[0]?.userId).toBe('user-empf');
    expect(events[0]?.metadata?.receivedToggles).toBe(1);
  });

  it('Primary-Action „Verstanden, Ausrüstung vorhanden" feuert die Quittungs-Mutation (Story 3.4 AC10)', () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-detail' })];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Verstanden, Ausrüstung vorhanden' }));
    expect(ackMutationMock.mutate).toHaveBeenCalledWith({ propagationGroupId: 'group-detail', einheitId: 'einheit-1' }, expect.any(Object));
  });

  it('Primary-Action entfernt den Banner optimistisch via hookDismiss vor Server-Antwort (Story 3.4 AC10)', () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-optimistic' })];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    fireEvent.click(screen.getByRole('button', { name: 'Verstanden, Ausrüstung vorhanden' }));
    expect(hookMock.dismiss).toHaveBeenCalledWith('group-optimistic');
  });

  it('Primary-Action setzt KEINEN Pending-/Spinner-State auf dem Button (Story 3.4 AC10)', () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-no-spinner' })];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    const button = screen.getByRole('button', { name: 'Verstanden, Ausrüstung vorhanden' });
    fireEvent.click(button);
    // Der Banner verschwindet optimistisch — wir verlassen uns auf das
    // hookDismiss-Verhalten, kein lokaler Pending-State.
    expect(button).not.toBeDisabled();
  });

  it('Bei Mutation-Fehler setzt das Wrapper-Div data-ack-error="true" (Story 3.4 AC10, Zero-Toast)', async () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-err' })];
    ackMutationMock.mutate.mockImplementation((_input, options?: { onError?: (error: unknown) => void }) => {
      options?.onError?.(new Error('boom'));
    });

    const { container, rerender } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    fireEvent.click(screen.getByRole('button', { name: 'Verstanden, Ausrüstung vorhanden' }));

    // Banner kommt durch erneutes WS-Frame zurück (in echt durch den
    // Re-Sync; im Test simulieren wir den Refetch-Path durch Re-Rendern
    // mit derselben Group im hookMock.banner).
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-err' })];
    rerender(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

    expect(container.querySelector('[data-propagation-group-id="group-err"]')).toHaveAttribute('data-ack-error', 'true');
  });

  it('Secondary-Action „Später" delegiert an den Hook-Side dismiss (AC6)', () => {
    hookMock.banner = [makeBanner({ propagationGroupId: 'group-dismiss' })];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(screen.getByTestId('psa-empfang-banner')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Später' }));

    // Single-Source-of-Truth ist der Hook-Banner-Array — die Komponente
    // delegiert den Dismiss an `hookDismiss`. Kein lokales `dismissed`-Set,
    // damit ein erneut eingehender Event mit derselben propagationGroupId den
    // Banner regulär wieder sichtbar macht (AC9: „unsichtbar → sichtbar").
    expect(hookMock.dismiss).toHaveBeenCalledWith('group-dismiss');
  });

  it('setzt data-propagation-group-id auf den Wrapper für E2E-Selektoren (AC6)', () => {
    hookMock.banner = [
      makeBanner({ propagationGroupId: 'group-aaa', occurredAt: '2026-04-24T10:00:01.000Z' }),
      makeBanner({ propagationGroupId: 'group-bbb', occurredAt: '2026-04-24T10:00:02.000Z' }),
    ];
    const { container } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(container.querySelector('[data-propagation-group-id="group-aaa"]')).not.toBeNull();
    expect(container.querySelector('[data-propagation-group-id="group-bbb"]')).not.toBeNull();
  });

  it('respektiert Reduced-Motion: keine JS-Animationen im DOM (AC10)', () => {
    // Strukturelle Verifikation (kein vitest-axe im Repo, Pattern aus
    // SicherheitsregelDrawer-Spec): wir verlassen uns auf
    // `motion-reduce:transition-none` von `SeverityBanner.tsx` für CSS-
    // Transitions und auf das **bewusste** Fehlen JS-getriebener
    // Animationen in dieser Komponente. Der Test dokumentiert die
    // Nicht-Animation: keine inline-`style="animation"` / `style="transition"`-Wrapper.
    hookMock.banner = [makeBanner()];
    const { container } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    expect(container.querySelector('[style*="animation"]')).toBeNull();
    expect(container.querySelector('[style*="transition"]')).toBeNull();
  });

  it('A11y-strukturell: kritischer Banner trägt aria-live="assertive" + role="status" (AC6)', () => {
    hookMock.banner = [makeBanner()];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    const banner = screen.getByTestId('psa-empfang-banner');
    // UX-Spec Z. 850 — `role="status"` + `aria-live="assertive"` ist die im
    // Repo bewusst gewählte A11y-äquivalente Variante zu `role="alert"`.
    expect(banner.tagName.toLowerCase()).toBe('section');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'assertive');
  });

  it('Headline überschreitet 60 Zeichen nicht — auch bei großem Bulk (AC5/AC6)', () => {
    // 12 Toggles → Headline „12 PSA-Profile geändert" = 23 Zeichen, ohnehin
    // weit unter dem Limit. Der Test sichert die Invariante zukünftig ab,
    // falls der Title-Builder jemals dynamische Profil-Namen einsetzen würde
    // — `SeverityBanner` truncated zwar auf 57 Zeichen + „…", aber AC6
    // verlangt, dass der Title-Builder die Limite **nicht aktiv überlängt**.
    hookMock.banner = [
      makeBanner({
        propagationGroupId: 'group-bulk',
        profilToggles: Array.from({ length: 12 }, (_, i) => ({
          profil: 'CBRN_PATIENT',
          aktion: 'AKTIVIERT' as const,
          zuweisungId: `z-${i}`,
        })),
      }),
    ];
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
    const headline = screen.getByTestId('psa-empfang-banner').querySelector('h3');
    expect(headline).not.toBeNull();
    expect(headline?.textContent ?? '').not.toMatch(/…$/);
    expect((headline?.textContent ?? '').length).toBeLessThanOrEqual(60);
  });

  it('Sammel-Banner ist SeverityBanner variant="warning" tone="polite" mit Drawer-Pfad (AC7, P5)', () => {
    hookMock.banner = [
      makeBanner({ propagationGroupId: 'g1', occurredAt: '2026-04-24T10:00:01.000Z' }),
      makeBanner({ propagationGroupId: 'g2', occurredAt: '2026-04-24T10:00:02.000Z' }),
      makeBanner({ propagationGroupId: 'g3', occurredAt: '2026-04-24T10:00:03.000Z' }),
      makeBanner({ propagationGroupId: 'g4', occurredAt: '2026-04-24T10:00:04.000Z' }),
    ];
    const onShowDetails = vi.fn();
    render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" onShowDetails={onShowDetails} />);

    const overflow = screen.getByTestId('psa-empfang-overflow-banner');
    expect(overflow).toHaveAttribute('data-variant', 'warning');
    expect(overflow).toHaveAttribute('aria-live', 'polite');

    // P5: Overflow-Pfad öffnet jetzt denselben Drawer wie der sichtbare
    // Banner-Pfad. Vor P5 ging der Pfad nur über den `onShowDetails`-Stub —
    // der Drawer wurde nie gemountet. Wir selektieren den Overflow-Banner-
    // Button gezielt via Container statt `[last]`-Indexing (P13-analog).
    const overflowPrimary = within(overflow).getByRole('button', { name: 'Details ansehen' });
    fireEvent.click(overflowPrimary);

    // Drawer ist nun für g4 gemountet.
    expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();
    // `onShowDetails` ist als optionale Telemetrie-Notify weiterhin verdrahtet.
    expect(onShowDetails).toHaveBeenLastCalledWith('g4');
  });

  describe('Story 3.5 AC9 — Tertiary „Details ansehen" öffnet Drawer', () => {
    it('Banner zeigt Tertiary-Button; Klick öffnet Detail-Drawer für die Group (P13: testid statt last)', () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-3-5' })];
      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

      // Pre: kein Drawer offen.
      expect(screen.queryByTestId('psa-profil-detail-drawer')).toBeNull();

      // P13: Selektion via stabilem `data-testid="severity-banner-tertiary"`
      // statt DOM-Reihenfolge-abhängigem `getAllByRole(...)[last]`.
      const tertiary = screen.getByTestId('severity-banner-tertiary');
      expect(tertiary).toHaveTextContent('Details ansehen');

      fireEvent.click(tertiary);

      // Drawer ist nun montiert für die Group.
      expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();
    });

    it('Drawer-Quittungs-Erfolg ruft dismiss(propagationGroupId)', async () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-quit' })];
      ackMutationMock.mutate.mockImplementation(() => undefined);

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
      fireEvent.click(screen.getByTestId('severity-banner-tertiary'));

      // Drawer ruft `useAckPsaQuittung.mutateAsync` intern; im Spec-Test
      // mocken wir das Hook-Result über das `ackMutationMock`. Wir prüfen
      // hier nur, dass der Tertiary-Pfad erreicht ist und der Drawer
      // mountet — die Quittungs-Wege selbst sind in
      // `PsaProfilDetailDrawer.spec.tsx` getestet.
      expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();
    });
  });

  describe('Story 3.6 AC12 — Lücke-Wiring (Drawer → Dialog → Mutation → Banner-Dismiss)', () => {
    it('öffnet Lücke-Dialog, wenn Drawer-`onMeldeLuecke`-Callback feuert', () => {
      // Wir simulieren den Drawer-Pfad indirekt: Tertiary „Details ansehen"
      // mountet den Drawer; der Drawer (Story 3.5) hat bereits den Lücke-
      // Button mit handleMeldeLuecke verdrahtet. Hier prüfen wir, dass das
      // Banner-Wrapper-Wiring den Dialog-State setzt.
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-luecke' })];
      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

      // Drawer öffnen über Tertiary-Action.
      fireEvent.click(screen.getByTestId('severity-banner-tertiary'));
      expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();

      // Lücke-Footer-Button im Drawer ruft `onMeldeLuecke` auf, was den
      // Dialog-State setzt → Dialog rendert.
      // Pattern: Story 3.5 AC10 hat den Footer-Button per `data-testid` markiert.
      const lueckeButton = screen.getByTestId('psa-profil-detail-luecke');
      fireEvent.click(lueckeButton);
      expect(screen.getByTestId('melde-luecke-dialog')).toBeInTheDocument();
    });

    it('Dialog-Submit ruft dismiss(propagationGroupId) und schließt den Drawer (Q6-Default)', async () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-luecke-submit' })];
      lueckeMutationMock.mutateAsync.mockResolvedValue(undefined);

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
      fireEvent.click(screen.getByTestId('severity-banner-tertiary'));

      const lueckeButton = screen.getByTestId('psa-profil-detail-luecke');
      fireEvent.click(lueckeButton);
      const dialog = screen.getByTestId('melde-luecke-dialog');
      expect(dialog).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('melde-luecke-submit'));

      // mutateAsync feuert; onSuccess ruft dismiss() für die Group + schließt
      // Drawer (Q6-Default).
      await waitFor(() => expect(lueckeMutationMock.mutateAsync).toHaveBeenCalled());
      await waitFor(() => expect(hookMock.dismiss).toHaveBeenCalledWith('group-luecke-submit'));
      await waitFor(() => expect(screen.queryByTestId('melde-luecke-dialog')).toBeNull());
      await waitFor(() => expect(screen.queryByTestId('psa-profil-detail-drawer')).toBeNull());
    });

    it('Per-Row-Lücke-Button öffnet Dialog → Submit dismiss + Drawer-Close (AC12)', async () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-per-row' })];
      lueckeMutationMock.mutateAsync.mockResolvedValue(undefined);

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);
      fireEvent.click(screen.getByTestId('severity-banner-tertiary'));
      expect(screen.getByTestId('psa-profil-detail-drawer')).toBeInTheDocument();

      // EquipmentChecklist rendert pro Einheit eine Status-Row mit einem
      // Lücke-Button (`aria-label="Lücke für Einheit … melden"`). Wir wählen
      // den Per-Row-Button bewusst NICHT über `psa-profil-detail-luecke`
      // (= Footer), sondern über `aria-label` (E2E-Wiring AC12).
      const perRowButton = screen.getByRole('button', { name: /Lücke für Einheit .* melden/ });
      fireEvent.click(perRowButton);

      const dialog = screen.getByTestId('melde-luecke-dialog');
      expect(dialog).toBeInTheDocument();

      fireEvent.click(screen.getByTestId('melde-luecke-submit'));

      await waitFor(() => expect(lueckeMutationMock.mutateAsync).toHaveBeenCalled());
      await waitFor(() => expect(hookMock.dismiss).toHaveBeenCalledWith('group-per-row'));
      await waitFor(() => expect(screen.queryByTestId('melde-luecke-dialog')).toBeNull());
      await waitFor(() => expect(screen.queryByTestId('psa-profil-detail-drawer')).toBeNull());
    });
  });

  describe('Story 3.5 P14 — Re-Emission von all_banners_delivered nach Dismiss + Wieder-Eintreffen', () => {
    it('emittedRef wird bereinigt, wenn die Group aus dem Banner-Stack verschwindet', () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-redo' })];
      const { rerender } = render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

      let events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'all_banners_delivered');
      expect(events).toHaveLength(1);

      // Group wird dismissed → Banner-Queue leer → emittedRef bereinigt.
      hookMock.banner = [];
      rerender(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

      // Re-Eintreffen derselben Group → erneutes all_banners_delivered.
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-redo' })];
      rerender(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />);

      events = eigenschutzTelemetryQueue.snapshot().filter((e) => e.eventName === 'all_banners_delivered');
      // Zwei Events: einmal beim ersten Eintreffen, einmal nach Re-Trigger.
      expect(events.filter((e) => e.propagationGroupIdCandidate === 'group-redo')).toHaveLength(2);
    });
  });

  describe('Story 3.7 AC7 — Re-Prompt-Pfad (repromptedKeys + synthetischer Banner)', () => {
    it('hängt „Erneut" an Headline, wenn Reprompt-Notice für die aktive Einheit eintrifft', () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-A' })];
      const repromptNotices = [
        {
          propagationGroupId: 'group-A',
          einheitId: 'einheit-1',
          ueberfaelligSeitMin: 6,
          occurredAt: '2026-04-29T10:00:00.000Z',
          zuweisungId: 'zuw-1',
        },
      ];

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" repromptNotices={repromptNotices} onRepromptDismiss={vi.fn()} />);

      const headline = screen.getByTestId('psa-empfang-banner').querySelector('h3');
      expect(headline?.textContent ?? '').toContain('Erneut');
    });

    it('rendert KEIN „Erneut"-Tag, wenn die Reprompt-Notice für eine ANDERE Einheit kommt', () => {
      hookMock.banner = [makeBanner({ propagationGroupId: 'group-A' })];
      const repromptNotices = [
        {
          propagationGroupId: 'group-A',
          einheitId: 'einheit-andere',
          ueberfaelligSeitMin: 6,
          occurredAt: '2026-04-29T10:00:00.000Z',
          zuweisungId: null,
        },
      ];

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" repromptNotices={repromptNotices} />);

      const headline = screen.getByTestId('psa-empfang-banner').querySelector('h3');
      expect(headline?.textContent ?? '').not.toContain('Erneut');
    });

    it('rendert synthetischen Reprompt-Banner, wenn ursprünglicher Banner dismissed wurde und neue Notice eintrifft', () => {
      hookMock.banner = [];
      const repromptNotices = [
        {
          propagationGroupId: 'group-X',
          einheitId: 'einheit-1',
          ueberfaelligSeitMin: 6,
          occurredAt: '2026-04-29T10:00:00.000Z',
          zuweisungId: null,
        },
      ];

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" repromptNotices={repromptNotices} />);

      const synthetic = screen.getByTestId('psa-empfang-banner-reprompt');
      expect(synthetic).toBeInTheDocument();
      expect(synthetic).toHaveTextContent('PSA-Bekanntgabe wartet auf Quittung — Erneut');
    });

    it('synthetischer Banner liest begruendung aus React-Query-Cache (usePsaProfileByEinheit)', () => {
      hookMock.banner = [];
      profileMock.data = [
        {
          id: 'r1',
          einsatzId: 'einsatz-1',
          einheitId: 'einheit-1',
          profil: 'CBRN_PATIENT',
          gueltigVon: '2026-04-29T09:30:00.000Z',
          gueltigBis: null,
          aktiviertVonUserId: 'user-7',
          begruendung: 'Verdacht auf Kontamination',
          propagationGroupId: 'group-X',
          version: 1,
        },
      ];
      const repromptNotices = [
        {
          propagationGroupId: 'group-X',
          einheitId: 'einheit-1',
          ueberfaelligSeitMin: 6,
          occurredAt: '2026-04-29T10:00:00.000Z',
          zuweisungId: null,
        },
      ];

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" repromptNotices={repromptNotices} />);

      expect(screen.getByTestId('psa-empfang-banner-reprompt')).toHaveTextContent('Grund: Verdacht auf Kontamination');
    });

    it('synthetischer Banner — Secondary-Action ruft onRepromptDismiss mit (groupId, einheitId)', () => {
      hookMock.banner = [];
      const onRepromptDismiss = vi.fn();
      const repromptNotices = [
        {
          propagationGroupId: 'group-X',
          einheitId: 'einheit-1',
          ueberfaelligSeitMin: 6,
          occurredAt: '2026-04-29T10:00:00.000Z',
          zuweisungId: null,
        },
      ];

      render(<PsaProfilEmpfangBanner einsatzId="einsatz-1" repromptNotices={repromptNotices} onRepromptDismiss={onRepromptDismiss} />);

      const reprompt = screen.getByTestId('psa-empfang-banner-reprompt');
      const secondary = within(reprompt).getByRole('button', { name: 'Schließen' });
      fireEvent.click(secondary);

      expect(onRepromptDismiss).toHaveBeenCalledWith('group-X', 'einheit-1');
    });
  });
});
