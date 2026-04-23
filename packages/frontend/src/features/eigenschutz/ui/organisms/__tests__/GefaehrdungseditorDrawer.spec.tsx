/**
 * Spec für den `GefaehrdungseditorDrawer` (Story 2.1, Task 8).
 *
 * Teststrategie:
 * - Feature-Level-Mocks für alle API-Hooks — konsistent mit den
 *   bestehenden Route- und Query-Tests im Eigenschutz-Slice.
 * - `useCreateGefaehrdungsbeurteilung` wird als kontrollierter Mock
 *   angelegt (`mutateAsync` wird pro Test über `mockImplementation`
 *   konfiguriert), damit Erfolgs- und Sentinel-Fehlerpfade deterministisch
 *   prüfbar sind.
 * - A11y wird strukturell assertet (keine `vitest-axe`-Dep im Repo): Rolle
 *   `dialog` + `role="radiogroup"` + Heading-Level — das reicht für die
 *   Drawer-Verantwortung, da die globale Dialog-Primitive (`Dialog.SlideIn`)
 *   fokus-trap und aria-modal bereits garantiert.
 */

import { renderWithProviders } from '@/test/utils';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Die Shared-Zod-Schemas validieren `cuidIdSchema` strikt auf
// 20–32 lowercase-alphanum. Damit TanStack-Form den Submit nicht mit
// „Ungültige CUID" blockiert, nutzen wir im Test fachlich-passende,
// regex-konforme Fixtures (statt „einheit-1"-Slugs).
const VORLAGE_MANV_ID = 'cl1vorlagemanvxxxxxxxxxx';
const VORLAGE_VU_ID = 'cl1vorlagevuverkehrxxxxx';
const EINHEIT_1_ID = 'cl1einheitrettungstrupp1';
const EINHEIT_2_ID = 'cl1einheitrettungstrupp2';
const BEURTEILUNG_1_ID = 'cl1beurteilungidcreate01';
const BEURTEILUNG_2_ID = 'cl1beurteilungidcreate02';

const { mocks } = vi.hoisted(() => ({
  mocks: {
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

mocks.vorlagenState.data = [
  {
    id: VORLAGE_MANV_ID,
    slug: 'manv',
    name: 'MANV',
    version: 1,
    items: [{ id: 'i1' }, { id: 'i2' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: VORLAGE_VU_ID,
    slug: 'vu-patientenversorgung',
    name: 'Verkehrsunfall',
    version: 1,
    items: [{ id: 'i3' }],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

mocks.einheitenState.data = [
  { id: EINHEIT_1_ID, name: 'Rettungstrupp 1' },
  { id: EINHEIT_2_ID, name: 'Rettungstrupp 2' },
];

vi.mock('@/features/eigenschutz/api/queries', () => ({
  EIGENSCHUTZ_QUERY_KEYS: {
    gefaehrdungsbeurteilungsVorlagen: (id: string) => ['eigenschutz', id, 'vorlagen'],
    gefaehrdungsbeurteilungen: (id: string) => ['eigenschutz', id, 'beurteilungen'],
  },
  useGefaehrdungsbeurteilungVorlagen: () => mocks.vorlagenState,
  useCreateGefaehrdungsbeurteilung: () => mocks.createMutation,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheitenState,
}));

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    // Overwrite nur `useQuery` im Drawer-Modul — der einzige Caller ist
    // der inline-definierte Gefahrenzonen-Hook. Andere Consumer nutzen
    // bereits feature-level Mocks.
    useQuery: () => ({ ...mocks.gefahrenzonenState }),
  };
});

vi.mock('@/shared', () => ({
  api: {
    gefahrenzonen: () => ({
      gefahrenzoneControllerListVAlpha: vi.fn(),
    }),
  },
}));

import { GefaehrdungseditorDrawer } from '../GefaehrdungseditorDrawer.organism';

function buildResponseError(status: number, body?: unknown): { response: Response } {
  const bodyJson = body ? JSON.stringify(body) : '';
  const response = new Response(bodyJson, {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
  return { response };
}

describe('GefaehrdungseditorDrawer (Story 2.1 Task 8)', () => {
  beforeEach(() => {
    mocks.createMutation.mutateAsync = vi.fn();
    mocks.createMutation.isPending = false;
    mocks.gefahrenzonenState = { data: [], isPending: false };
  });

  it('rendert 5 Seed-Cards plus „Leeres Formular" und die Form-Felder (Smoke)', () => {
    // Zwei Seed-Vorlagen im Mock + eine Leer-Card = 3 Radios.
    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    const radiogroup = screen.getByRole('radiogroup', { name: 'Vorlage wählen' });
    const radios = within(radiogroup).getAllByRole('radio');
    expect(radios).toHaveLength(3);
    expect(screen.getByText('MANV')).toBeInTheDocument();
    expect(screen.getByText('Verkehrsunfall')).toBeInTheDocument();
    expect(screen.getByText('Leeres Formular')).toBeInTheDocument();

    expect(screen.getByLabelText(/Einheit \*/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Gefahrenzone/)).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Abbrechen/i })).toBeInTheDocument();
    expect(screen.getByTestId('gefaehrdungseditor-submit')).toBeInTheDocument();
  });

  it('hebt die ausgewählte Seed-Card hervor und exklusiviert „Leer"', async () => {
    const user = userEvent.setup();
    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    const manvCard = screen.getByTestId(`vorlage-card-${VORLAGE_MANV_ID}`);
    const leerCard = screen.getByTestId('vorlage-card-leer');

    await user.click(manvCard);
    expect(manvCard).toHaveAttribute('aria-checked', 'true');
    expect(leerCard).toHaveAttribute('aria-checked', 'false');

    await user.click(leerCard);
    expect(leerCard).toHaveAttribute('aria-checked', 'true');
    expect(manvCard).toHaveAttribute('aria-checked', 'false');
  });

  it('submitted Seed + Einheit mit vorlageId gesetzt, gefahrenzoneId null', async () => {
    const user = userEvent.setup();
    mocks.createMutation.mutateAsync.mockResolvedValue({ id: BEURTEILUNG_1_ID });
    const onCreated = vi.fn();
    const onClose = vi.fn();

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={onClose} onCreated={onCreated} />);

    await user.click(screen.getByTestId(`vorlage-card-${VORLAGE_MANV_ID}`));
    await user.selectOptions(screen.getByTestId('gefaehrdungseditor-einheit'), EINHEIT_1_ID);
    await user.click(screen.getByTestId('gefaehrdungseditor-submit'));

    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith({
        einheitId: EINHEIT_1_ID,
        vorlageId: VORLAGE_MANV_ID,
        gefahrenzoneId: null,
      });
    });
    expect(onCreated).toHaveBeenCalledWith(BEURTEILUNG_1_ID);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('submitted Leer + Einheit mit vorlageId null', async () => {
    const user = userEvent.setup();
    mocks.createMutation.mutateAsync.mockResolvedValue({ id: BEURTEILUNG_2_ID });

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.click(screen.getByTestId('vorlage-card-leer'));
    await user.selectOptions(screen.getByTestId('gefaehrdungseditor-einheit'), EINHEIT_2_ID);
    await user.click(screen.getByTestId('gefaehrdungseditor-submit'));

    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith({
        einheitId: EINHEIT_2_ID,
        vorlageId: null,
        gefahrenzoneId: null,
      });
    });
  });

  it('zeigt Inline-Meldung bei 422 BusinessRule:EinheitHatBereitsBeurteilung', async () => {
    const user = userEvent.setup();
    mocks.createMutation.mutateAsync.mockRejectedValue(buildResponseError(422, { code: 'BusinessRule:EinheitHatBereitsBeurteilung', message: 'duplicate' }));

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.click(screen.getByTestId('vorlage-card-leer'));
    await user.selectOptions(screen.getByTestId('gefaehrdungseditor-einheit'), EINHEIT_1_ID);
    await user.click(screen.getByTestId('gefaehrdungseditor-submit'));

    const alert = await screen.findByTestId('gefaehrdungseditor-inline-error');
    expect(alert).toHaveTextContent(/bereits eine Beurteilung/i);
  });

  it('zeigt Inline-Meldung bei 403 Forbidden (defensive, Parent sollte vorab disablen)', async () => {
    const user = userEvent.setup();
    mocks.createMutation.mutateAsync.mockRejectedValue(buildResponseError(403, { code: 'Forbidden' }));

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.click(screen.getByTestId('vorlage-card-leer'));
    await user.selectOptions(screen.getByTestId('gefaehrdungseditor-einheit'), EINHEIT_1_ID);
    await user.click(screen.getByTestId('gefaehrdungseditor-submit'));

    const alert = await screen.findByTestId('gefaehrdungseditor-inline-error');
    expect(alert).toHaveTextContent(/Keine Berechtigung/i);
  });

  it('Esc schließt ohne Mutation auszulösen (AC10)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={onClose} onCreated={vi.fn()} />);

    await user.keyboard('{Escape}');
    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
    expect(mocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('A11y: Drawer bietet role="dialog", Radio-Gruppe und semantische Überschrift', () => {
    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('radiogroup', { name: 'Vorlage wählen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Vorlage wählen' })).toBeInTheDocument();
  });

  it('blockiert Submit ohne Auswahl mit Inline-Validierung', async () => {
    const user = userEvent.setup();

    renderWithProviders(<GefaehrdungseditorDrawer einsatzId="einsatz-1" open={true} onClose={vi.fn()} onCreated={vi.fn()} />);

    await user.selectOptions(screen.getByTestId('gefaehrdungseditor-einheit'), EINHEIT_1_ID);
    await user.click(screen.getByTestId('gefaehrdungseditor-submit'));

    const alert = await screen.findByTestId('gefaehrdungseditor-inline-error');
    expect(alert).toHaveTextContent(/Vorlage oder „Leeres Formular"/);
    expect(mocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });
});
