/**
 * Keyboard-Journeys-Audit (Story 7.8 AC5).
 *
 * **Audit-Ziel:** verifizieren, dass die vier Eigenschutz-Hauptjourneys
 * (Markus 1a Gefährdungsbeurteilung, Markus 1b CBRN-Hochstufung,
 * Steffi 2 PSA-Empfang quittieren, Vorfall-Export 4) ohne Maus
 * ausschließlich über Tab/Shift-Tab/Enter/Space/Escape erreichbar sind.
 *
 * **Was diese Spec prüft (Block A):**
 * - jsdom prüft die Tab-/Fokus-Reihenfolge sowie die Aktivierung der
 *   Schlüssel-Mutationen via Tastatur (Enter/Space).
 * - Die kritischen Tastatur-Pfade auf den Schlüssel-Komponenten
 *   (`GefaehrdungseditorDrawer`, `PSAChangeDrawer`,
 *   `PsaProfilEmpfangBanner`, `VorfallDetailPage`) werden Schritt für
 *   Schritt durchlaufen, ohne `userEvent.click(...)` oder `fireEvent.click(...)`.
 *
 * **Was diese Spec NICHT prüft (Block B / Audit-Bericht T6):**
 * - Native Browser-Fokus-Visualisierung (Pixel-Ringe, Kontrast,
 *   Outline-Sichtbarkeit) — gehört in NVDA-/VoiceOver-Walks.
 * - Globale Shortcuts (`?`, `⌘K`, Command-Palette-Navigation) — die
 *   liegen in `useEigenschutzShortcuts` und werden in Story 7.6
 *   separat geprüft (Hook-Spec).
 * - End-to-End-Routing (Dashboard → Page → Drawer) — jsdom kann den
 *   vollen TanStack-Router-Mount für die Markus-/Steffi-Journeys nicht
 *   ohne mehrere Provider-Kaskaden simulieren. Wir reduzieren auf die
 *   reachable Schlüssel-Komponente; siehe Pragmatik-Notiz in jedem
 *   `describe`-Header.
 *
 * **Bekannter Verstoß-Kandidat (Block-B-Handoff):**
 * - Journey 1b erwartet laut Story-Text ein `SeverityBanner` mit
 *   `role="alert"` als Submit-Bestätigung. Im Codebase-Stand rendert
 *   sowohl der Eigenschutz-`SeverityBanner.tsx` (organisms) als auch
 *   der `PsaProfilEmpfangBanner` `role="status"` mit
 *   `aria-live="assertive"` (kein `role="alert"`). Block A reduziert
 *   die Verifikation auf den Submit-Aufruf der Mutation; ob der
 *   resultierende Confirmation-Banner für Screenreader korrekt als
 *   Alert angekündigt wird, bleibt Block-B-Aufgabe (NVDA-Walk).
 */

import { renderWithProviders, userEvent } from '@/test/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// -------------------------------------------------------------------------
// Shared Hoisted-Mocks (pro describe-Block aktiviert)
// -------------------------------------------------------------------------

// Journey 1a — GefaehrdungseditorDrawer Mocks
const VORLAGE_MANV_ID = 'cl1vorlagemanvxxxxxxxxxx';
const EINHEIT_1_ID = 'cl1einheitrettungstrupp1';
const BEURTEILUNG_1_ID = 'cl1beurteilungidcreate01';

const { gefMocks } = vi.hoisted(() => ({
  gefMocks: {
    vorlagenState: {
      data: [] as unknown[],
      isPending: false,
      isError: false,
    },
    einheitenState: {
      data: [] as Array<{ id: string; name: string }>,
      isPending: false,
    },
    gefahrenzonenState: {
      data: [] as Array<{ id: string; label: string }>,
      isPending: false,
    },
    createMutation: {
      mutateAsync: vi.fn(),
      isPending: false,
    },
  },
}));

vi.mock('@/features/eigenschutz/api/queries', () => ({
  EIGENSCHUTZ_QUERY_KEYS: {
    psaProfileByEinheit: (einsatzId: string, einheitId: string) => ['eigenschutz', einsatzId, 'psa-profile', einheitId] as const,
    gefaehrdungsbeurteilungsVorlagen: (id: string) => ['eigenschutz', id, 'vorlagen'],
    gefaehrdungsbeurteilungen: (id: string) => ['eigenschutz', id, 'beurteilungen'],
  },
  useGefaehrdungsbeurteilungVorlagen: () => gefMocks.vorlagenState,
  useCreateGefaehrdungsbeurteilung: () => gefMocks.createMutation,
  useChangePsaProfil: () => psaDrawerMocks.changeMutation,
  usePsaProfileByEinheit: () => psaDrawerMocks.profileQuery,
  useAckPsaQuittung: () => psaBannerMocks.ackMutation,
  useMeldeLuecke: () => psaBannerMocks.lueckeMutation,
  PsaProfilConflictError: class PsaProfilConflictError extends Error {
    constructor(
      public variant: 'OCC' | 'DuplicateActiveProfile',
      public currentVersion?: number,
      public attemptedVersion?: number,
      public originalError?: unknown,
      public einheitId?: string,
      public profil?: string,
    ) {
      super('PsaProfilConflictError');
    }
  },
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => gefMocks.einheitenState,
}));

vi.mock('@/features/kraefte/ui/molecules', () => ({
  EinheitCombobox: ({ value, onChange, onBlur, disabled, label }: { value: string; onChange: (id: string) => void; onBlur?: () => void; disabled?: boolean; label?: string }) => (
    <label>
      <span>{label}</span>
      <select aria-label={label} data-testid="gefaehrdungseditor-einheit" value={value} onChange={(event) => onChange(event.target.value)} onBlur={onBlur} disabled={disabled}>
        <option value="">— bitte wählen —</option>
        {gefMocks.einheitenState.data.map((einheit) => (
          <option key={einheit.id} value={einheit.id}>
            {einheit.name}
          </option>
        ))}
      </select>
    </label>
  ),
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    // Overwrite nur `useQuery` für den inline-Gefahrenzonen-Hook im
    // GefaehrdungseditorDrawer. Andere Consumer (PSAChangeDrawer-Bulk,
    // PsaProfilEmpfangBanner) sind über Feature-Mocks abgedeckt.
    useQuery: () => ({ ...gefMocks.gefahrenzonenState }),
  };
});

vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerListVAlpha: vi.fn(),
    }),
    eigenschutz: () => ({
      psaProfilControllerGetPsaProfileVAlpha: vi.fn().mockResolvedValue({ data: [] }),
      psaProfilControllerBulkChangePsaProfilVAlpha: vi.fn().mockResolvedValue({ data: { propagationGroupId: 'group-1', affected: [] } }),
    }),
  },
}));

// Journey 1b — PSAChangeDrawer Mocks
const { psaDrawerMocks } = vi.hoisted(() => ({
  psaDrawerMocks: {
    profileQuery: { data: [] as Array<{ profil: string; version: number; einheitId?: string }>, isLoading: false },
    changeMutation: { mutateAsync: vi.fn(), isPending: false, error: null as unknown },
  },
}));

// Journey 2 — PsaProfilEmpfangBanner Mocks
const { psaBannerMocks } = vi.hoisted(() => ({
  psaBannerMocks: {
    liveBannerHook: { banner: [] as unknown[], dismiss: vi.fn() },
    aktiveEinheit: { einheitId: 'einheit-1' as string | null },
    currentUser: { user: { id: 'user-empf' } as { id: string } | null },
    ackMutation: { mutate: vi.fn() },
    lueckeMutation: { mutateAsync: vi.fn().mockResolvedValue(undefined), isPending: false } as { mutateAsync: ReturnType<typeof vi.fn>; isPending: boolean },
  },
}));

vi.mock('@/features/eigenschutz/api/use-eigenschutz-psa-live-banner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/eigenschutz/api/use-eigenschutz-psa-live-banner')>();
  return {
    ...actual,
    useEigenschutzPsaLiveBanner: () => ({
      banner: psaBannerMocks.liveBannerHook.banner,
      status: 'connected',
      dismiss: psaBannerMocks.liveBannerHook.dismiss,
    }),
  };
});

vi.mock('@/features/eigenschutz/hooks/use-aktive-einsatz-einheit', () => ({
  useAktiveEinsatzEinheit: () => ({
    einheitId: psaBannerMocks.aktiveEinheit.einheitId,
    einheitName: psaBannerMocks.aktiveEinheit.einheitId === null ? null : 'Rettungstrupp 1',
    einheiten: [],
    setAktiveEinheit: vi.fn(),
    isLoading: false,
  }),
}));

vi.mock('@/features/auth/api/use-current-user', () => ({
  useCurrentUser: () => psaBannerMocks.currentUser,
}));

// Journey 4 — VorfallDetailPage Mocks
const { vorfallMocks } = vi.hoisted(() => ({
  vorfallMocks: {
    query: {
      data: undefined as unknown,
      error: undefined as unknown,
      isLoading: false,
      isError: false,
    },
    exportPdf: {
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null as unknown,
    },
    exportJson: {
      mutate: vi.fn(),
      reset: vi.fn(),
      isPending: false,
      isError: false,
      error: null as unknown,
    },
    auditTimeline: {
      data: [] as unknown[] | undefined,
      error: undefined as unknown,
      isLoading: false,
      isError: false,
    },
  },
}));

vi.mock('@/features/eigenschutz/api/use-get-vorfall', () => ({
  useGetVorfall: () => vorfallMocks.query,
}));

vi.mock('@/features/eigenschutz/api/use-export-vorfall-as-pdf', () => ({
  useExportVorfallAlsPdf: () => vorfallMocks.exportPdf,
}));

vi.mock('@/features/eigenschutz/api/use-export-vorfall-as-json', () => ({
  useExportVorfallAlsJson: () => vorfallMocks.exportJson,
}));

vi.mock('@/features/eigenschutz/api/use-vorfall-audit-timeline', () => ({
  useVorfallAuditTimeline: () => vorfallMocks.auditTimeline,
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    Link: ({ children, ...rest }: { children: ReactNode } & Record<string, unknown>) => (
      <a data-mock-link {...rest}>
        {children}
      </a>
    ),
  };
});

// Imports nach Mocks (Hoisted-Pattern).
import { GefaehrdungseditorDrawer } from '../ui/organisms/GefaehrdungseditorDrawer.organism';
import { PSAChangeDrawer } from '../ui/organisms/PSAChangeDrawer';
import { PsaProfilEmpfangBanner } from '../ui/organisms/PsaProfilEmpfangBanner';
import { VorfallDetailPage } from '../ui/pages/VorfallDetailPage';
import type { PsaProfilLiveBanner } from '../api/use-eigenschutz-psa-live-banner';

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

/**
 * Tabbt so lange, bis das gegebene Element den Fokus hält. Schlägt
 * mit klarer Diagnostik fehl, wenn der Fokus-Pfad nach `maxHops`
 * Schritten nicht erreicht ist — verhindert Endlos-Loop bei
 * geänderter Tab-Reihenfolge und macht den Verstoß im Test sichtbar.
 *
 * Hintergrund: jsdom liefert keine Pixel-Box, aber `document.activeElement`
 * folgt der DOM-Tab-Order. Der Helper nutzt `userEvent.tab()` Schritt für
 * Schritt, prüft nach jedem Hop und bricht ab, sobald das Ziel im Fokus
 * ist.
 */
async function tabUntil(user: ReturnType<typeof userEvent.setup>, target: HTMLElement, maxHops = 50): Promise<void> {
  if (document.activeElement === target) return;
  for (let hop = 0; hop < maxHops; hop++) {
    await user.tab();
    if (document.activeElement === target) return;
  }
  throw new Error(`tabUntil: Ziel-Element wurde nach ${maxHops} Tab-Hops nicht erreicht. Aktiv: ${describeElement(document.activeElement)}; Ziel: ${describeElement(target)}`);
}

function describeElement(el: Element | null): string {
  if (!el) return '<null>';
  const tag = el.tagName.toLowerCase();
  const testId = el.getAttribute('data-testid');
  const ariaLabel = el.getAttribute('aria-label');
  const text = (el.textContent ?? '').slice(0, 40);
  return `<${tag} testid=${testId ?? '∅'} aria-label="${ariaLabel ?? '∅'}" text="${text}">`;
}

function withQueryClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return <QueryClientProvider client={client}>{ui}</QueryClientProvider>;
}

// -------------------------------------------------------------------------
// Journey 1a — Markus, Gefährdungsbeurteilung anlegen
// -------------------------------------------------------------------------

/**
 * **Pragmatik-Reduktion (Block A):** Wir mounten nur den
 * `GefaehrdungseditorDrawer`-Organism statt der vollen
 * `GefaehrdungenPage`. Begründung: die Page mountet
 * `useEigenschutzShortcuts`, `useWorkspaceBlockingOverlay`,
 * `useEinsatzEinheiten`, TanStack-Router-`useNavigate` — eine
 * Mock-Kaskade, die das Tastatur-Signal verwässert. Der Drawer ist
 * der einzige Schritt der Journey, in dem Tastatur-Fokus,
 * Tab-Reihenfolge und Submit fachlich relevant sind; der Page-
 * Trigger („Neue Beurteilung"-Button) ist ein einzelner Native-
 * `<button>` und in `GefaehrdungenPage.spec.tsx` bereits abgedeckt.
 *
 * **Block-B-Handoff (Audit-Bericht T6):** Page-zu-Drawer-Übergang
 * inkl. Fokus-Restoration nach `onClose` — NVDA-Walk.
 */
describe('Journey 1a — Markus, Gefährdungsbeurteilung anlegen (Tastatur-only)', () => {
  beforeEach(() => {
    gefMocks.vorlagenState.data = [
      {
        id: VORLAGE_MANV_ID,
        slug: 'manv',
        name: 'MANV',
        version: 1,
        items: [{ id: 'i1' }],
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ];
    gefMocks.vorlagenState.isPending = false;
    gefMocks.vorlagenState.isError = false;
    gefMocks.einheitenState.data = [{ id: EINHEIT_1_ID, name: 'Rettungstrupp 1' }];
    gefMocks.einheitenState.isPending = false;
    gefMocks.gefahrenzonenState = { data: [], isPending: false };
    gefMocks.createMutation.mutateAsync = vi.fn().mockResolvedValue({ id: BEURTEILUNG_1_ID });
    gefMocks.createMutation.isPending = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Tastatur-Pfad: Vorlage wählen → Einheit wählen → Submit', async () => {
    const user = userEvent.setup({ delay: null });
    const onCreated = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={onClose} onCreated={onCreated} />);

    // Schritt 1: Vorlage-Karte (Radio) per Tab fokussieren und mit Space wählen.
    // SeedTemplateEntryCard rendert ein `role="radio"` mit aria-checked.
    const manvRadio = screen.getByTestId(`vorlage-card-${VORLAGE_MANV_ID}`);
    await tabUntil(user, manvRadio);
    expect(document.activeElement).toBe(manvRadio);
    await user.keyboard(' ');
    await waitFor(() => {
      expect(manvRadio).toHaveAttribute('aria-checked', 'true');
    });

    // Schritt 2: Einheit-Select per Tab fokussieren und über Tastatur-
    // Selektion einen Wert wählen. jsdom unterstützt `selectOptions`
    // ohne tatsächlichen Maus-Event — wir nutzen den Keyboard-Aware
    // Pfad (focus + selectOptions auf dem fokussierten Element).
    const einheitSelect = screen.getByTestId('gefaehrdungseditor-einheit') as HTMLSelectElement;
    await tabUntil(user, einheitSelect);
    expect(document.activeElement).toBe(einheitSelect);
    await user.selectOptions(einheitSelect, EINHEIT_1_ID);
    expect(einheitSelect.value).toBe(EINHEIT_1_ID);

    // Schritt 3: Submit-Button per Tab fokussieren und mit Enter auslösen.
    const submitButton = screen.getByTestId('gefaehrdungseditor-submit');
    await tabUntil(user, submitButton);
    expect(document.activeElement).toBe(submitButton);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(gefMocks.createMutation.mutateAsync).toHaveBeenCalledWith({
        einheitId: EINHEIT_1_ID,
        vorlageId: VORLAGE_MANV_ID,
        gefahrenzoneId: null,
      });
    });
    // Drawer schließt sich nach erfolgreichem Submit; onCreated trägt die ID
    // (Listen-Item-Sichtbarkeit ist in der Page-Spec abgedeckt — siehe Pragmatik).
    expect(onCreated).toHaveBeenCalledWith(BEURTEILUNG_1_ID);
    expect(onClose).toHaveBeenCalled();
  });

  it('Escape schließt den Drawer ohne Mutation', async () => {
    const user = userEvent.setup({ delay: null });
    const onClose = vi.fn();
    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={onClose} onCreated={vi.fn()} />);

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(gefMocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------------
// Journey 1b — Markus, CBRN-Hochstufung
// -------------------------------------------------------------------------

/**
 * **Pragmatik-Reduktion (Block A):** Smoke nur auf dem
 * `PSAChangeDrawer`. Der toggle-fähige Chip mit
 * `role="checkbox"` + Space/Enter-Handler ist `PSAProfileChip`,
 * mounted im Drawer (`PSAProfileMultiSelect`). Der Page-zu-Drawer-
 * Trigger („PSA ändern"-Link) ist ein einzelner `<a>`-Tag und kein
 * keyboard-spezifischer Pfad.
 *
 * **Bekannter Verstoß-Kandidat:** Story-Text erwartet einen
 * `SeverityBanner` mit `role="alert"` als Submit-Bestätigung — der
 * codebase-tatsächliche `PsaProfilEmpfangBanner` rendert
 * `role="status"` + `aria-live="assertive"`. Wir reduzieren Block A
 * auf den Submit-Aufruf der Mutation; die korrekte Screenreader-
 * Ankündigung (`role="alert"` vs. `role="status" aria-live`) ist
 * Block-B-Audit-Aufgabe.
 *
 * **Block-B-Handoff:** End-zu-End-Sichtbarkeit des Confirmation-
 * Banners im Screenreader-Walk; Fokus-Restoration nach Drawer-Close.
 */
describe('Journey 1b — Markus, CBRN-Hochstufung (Tastatur-only)', () => {
  beforeEach(() => {
    psaDrawerMocks.changeMutation.mutateAsync = vi.fn().mockResolvedValue({ propagationGroupId: 'group-cbrn', affected: [] });
    psaDrawerMocks.changeMutation.isPending = false;
    psaDrawerMocks.changeMutation.error = null;
    psaDrawerMocks.profileQuery.data = [];
    psaDrawerMocks.profileQuery.isLoading = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Tastatur-Pfad: CBRN-Chip mit Space toggeln → Begründung tippen → Enter-Submit', async () => {
    const user = userEvent.setup({ delay: null });
    const onSaved = vi.fn();
    render(withQueryClient(<PSAChangeDrawer einsatzId="einsatz-1" einheitId="einheit-1" einheitName="Rettungstrupp 1" callerUserId="user-1" open={true} onClose={vi.fn()} onSaved={onSaved} />));

    // Schritt 1: CBRN-Chip per Tab fokussieren und mit Space toggeln.
    // PSAProfileChip ist `role="checkbox"`-Button mit eigenem
    // `onKeyDown`-Handler für Space/Enter.
    const cbrnChip = await screen.findByTestId('psa-chip-cbrn_patient');
    await tabUntil(user, cbrnChip);
    expect(document.activeElement).toBe(cbrnChip);
    await user.keyboard(' ');
    await waitFor(() => {
      // Optimistic toggle: aria-checked dreht von "false" auf "true".
      expect(cbrnChip).toHaveAttribute('aria-checked', 'true');
    });

    // Schritt 2: Begründung-Textarea per Tab fokussieren und Text eintippen.
    const begruendung = screen.getByTestId('psa-change-begruendung') as HTMLTextAreaElement;
    await tabUntil(user, begruendung);
    expect(document.activeElement).toBe(begruendung);
    await user.keyboard('CBRN-Lage Patientenkontakt');
    expect(begruendung.value).toBe('CBRN-Lage Patientenkontakt');

    // Schritt 3: Submit-Button per Tab fokussieren und mit Enter auslösen.
    const submit = screen.getByTestId('psa-change-submit');
    await tabUntil(user, submit);
    expect(document.activeElement).toBe(submit);
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(psaDrawerMocks.changeMutation.mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(psaDrawerMocks.changeMutation.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        einheitId: 'einheit-1',
        profilToggles: expect.arrayContaining([expect.objectContaining({ profil: 'CBRN_PATIENT', aktivieren: true })]),
        begruendung: 'CBRN-Lage Patientenkontakt',
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });
});

// -------------------------------------------------------------------------
// Journey 2 — Steffi, PSA-Empfang quittieren
// -------------------------------------------------------------------------

/**
 * **Pragmatik-Reduktion (Block A):** Smoke nur auf dem
 * `PsaProfilEmpfangBanner`-Organism statt der vollen Dashboard-
 * Layout-Route. Der Banner ist als zentraler Layout-Container in
 * der Eigenschutz-Route gemountet (siehe `eigenschutz.route.spec.tsx`)
 * — der Tastatur-Pfad „Quittungs-Button via Enter" ist auf dem
 * Banner-Organism vollständig nachstellbar, der Route-Mount würde
 * nur Mock-Surface verdoppeln.
 *
 * **Block-B-Handoff:** Banner-Sichtbarkeits-Übergang und
 * Statuszeile-Update im realen Layout (Dashboard-Header) — NVDA-Walk.
 */
describe('Journey 2 — Steffi, PSA-Empfang quittieren (Tastatur-only)', () => {
  beforeEach(() => {
    psaBannerMocks.liveBannerHook.banner = [
      {
        propagationGroupId: 'group-1',
        einsatzId: 'einsatz-1',
        einheitId: 'einheit-1',
        profilToggles: [{ profil: 'CBRN_PATIENT', aktion: 'AKTIVIERT', zuweisungId: 'zuw-1' }],
        occurredAt: '2026-04-24T10:00:00.000Z',
        userIdHash: 'hash-x',
      },
    ] satisfies PsaProfilLiveBanner[];
    psaBannerMocks.liveBannerHook.dismiss = vi.fn();
    psaBannerMocks.aktiveEinheit.einheitId = 'einheit-1';
    psaBannerMocks.currentUser.user = { id: 'user-empf' };
    psaBannerMocks.ackMutation.mutate = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Tastatur-Pfad: Banner sichtbar → Quittungs-Button via Enter → Banner verschwindet', async () => {
    const user = userEvent.setup({ delay: null });

    render(withQueryClient(<PsaProfilEmpfangBanner einsatzId="einsatz-1" />));

    const banner = await screen.findByTestId('psa-empfang-banner');
    expect(banner).toHaveAttribute('aria-live', 'assertive');

    // Quittungs-Button („Verstanden, Ausrüstung vorhanden") liegt im Banner-
    // Footer und ist der erste interaktive Knopf. Wir tabben dorthin und
    // drücken Enter — kein Maus-Event.
    const quittierenButton = within(banner).getByRole('button', { name: 'Verstanden, Ausrüstung vorhanden' });
    await tabUntil(user, quittierenButton);
    expect(document.activeElement).toBe(quittierenButton);
    await user.keyboard('{Enter}');

    // handleAcknowledge ruft optimistisch dismiss(propagationGroupId) +
    // ackMutation.mutate(...) — beide sind Single-Source-of-Truth-Signale,
    // dass der Banner-Verschwinden-Pfad ausgelöst wurde.
    await waitFor(() => {
      expect(psaBannerMocks.liveBannerHook.dismiss).toHaveBeenCalledWith('group-1');
    });
    expect(psaBannerMocks.ackMutation.mutate).toHaveBeenCalledWith({ propagationGroupId: 'group-1', einheitId: 'einheit-1' }, expect.any(Object));
  });
});

// -------------------------------------------------------------------------
// Journey 4 — Vorfall-Export (PDF)
// -------------------------------------------------------------------------

/**
 * **Pragmatik-Reduktion (Block A):** Wir mounten die volle
 * `VorfallDetailPage` (sie hat überschaubare Mock-Surface) und
 * mocken `useExportVorfallAlsPdf` als ganzes — das ist die saubere
 * Trennlinie zwischen Tastatur-Audit (Block A) und Export-Pipeline-
 * Verifikation (separate Hook-Spec). Der eigentliche PDF-Download
 * (`downloadExport`) wird nicht ausgeführt, weil die Mutation
 * gemockt ist; die Story-Vorgabe „PDF-Download stubben" ist damit
 * effektiv erfüllt.
 *
 * **Block-B-Handoff:** Visueller Banner-Übergang nach
 * Erfolg/Fehler im echten Layout; ARIA-Live-Region für Screenreader.
 */
describe('Journey 4 — Vorfall-Export PDF (Tastatur-only)', () => {
  beforeEach(() => {
    vorfallMocks.query.data = {
      id: 'vorfall-1',
      einsatzId: 'cl9einsatz12345678901234',
      einheitId: 'cl9einheit12345678901234a',
      vorfallZeit: '2026-05-06T10:00:00.000Z',
      wann: '2026-05-06T10:00:00.000Z',
      was: 'Sturz beim Aufbau',
      wo: null,
      beteiligte: [{ kind: 'freitext', name: 'Max Mustermann', rolle: 'Sanitäter' }],
      massnahmen: 'Erstversorgung',
      unfallkasseRelevant: false,
      erfasstVonUserId: 'user-1',
      erfasstAm: '2026-05-06T10:01:00.000Z',
      kontextSnapshot: {},
      gefBeurteilungVersionId: null,
    };
    vorfallMocks.query.error = undefined;
    vorfallMocks.query.isLoading = false;
    vorfallMocks.query.isError = false;
    vorfallMocks.exportPdf.mutate = vi.fn();
    vorfallMocks.exportPdf.reset = vi.fn();
    vorfallMocks.exportPdf.isPending = false;
    vorfallMocks.exportPdf.isError = false;
    vorfallMocks.exportPdf.error = null;
    vorfallMocks.exportJson.mutate = vi.fn();
    vorfallMocks.exportJson.isPending = false;
    vorfallMocks.exportJson.isError = false;
    vorfallMocks.auditTimeline.data = [];
    vorfallMocks.auditTimeline.isLoading = false;
    vorfallMocks.auditTimeline.isError = false;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('Tastatur-Pfad: Export-PDF-Button via Tab erreichen und mit Enter auslösen', async () => {
    const user = userEvent.setup({ delay: null });

    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);

    const exportButton = await screen.findByTestId('vorfall-export-pdf-button');
    await tabUntil(user, exportButton);
    expect(document.activeElement).toBe(exportButton);

    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(vorfallMocks.exportPdf.mutate).toHaveBeenCalledWith({
        einsatzId: 'cl9einsatz12345678901234',
        vorfallId: 'vorfall-1',
      });
    });
  });

  it('Tastatur-Pfad: bei isError rendert ExportErrorBanner als sichtbares Inline-Feedback', () => {
    // Story-Text: „Toast/Inline-Banner sichtbar". Erfolgspfad rendert
    // keinen visuell sichtbaren Banner (nur Datei-Download); Fehlerpfad
    // rendert `vorfall-export-error-banner` mit `role="status"`. Wir
    // verifizieren beide Aspekte separat: der Erfolgspfad liegt im
    // ersten Test (mutate-Aufruf), das Inline-Banner-Feedback im
    // Fehlerpfad ist hier abgedeckt.
    vorfallMocks.exportPdf.isError = true;
    vorfallMocks.exportPdf.error = { response: { status: 500 } };

    renderWithProviders(<VorfallDetailPage einsatzId="cl9einsatz12345678901234" vorfallId="vorfall-1" />);

    const banner = screen.getByTestId('vorfall-export-error-banner');
    expect(banner).toBeInTheDocument();
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
