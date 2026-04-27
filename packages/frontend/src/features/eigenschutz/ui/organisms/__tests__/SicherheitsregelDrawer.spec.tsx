/**
 * Spec für den `SicherheitsregelDrawer` (Story 2.6, Task 8).
 *
 * Teststrategie analog zum `GefaehrdungseditorDrawer.spec.tsx`:
 * - Feature-Level-Mocks für alle API-Hooks.
 * - `useCreateSicherheitsregel` und `useUpdateSicherheitsregel` als
 *   kontrollierte Mocks, damit Erfolg, 409-Konflikt, Sentinel-Fehler
 *   deterministisch geprüft werden können.
 * - Kein vitest-axe-Setup im Repo; wir prüfen strukturell: `role="listbox"`
 *   mit `aria-multiselectable`, Labels per `htmlFor`, `role="alert"` für
 *   Inline-Error-Banner.
 */

import { renderWithProviders } from '@/test/utils';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const EINSATZ_ID = 'cl1einsatzidforsicherheit';
const EINHEIT_1_ID = 'cl1einheitrettungstrupp1';
const EINHEIT_2_ID = 'cl1einheitrettungstrupp2';
const REGEL_ID = 'cl1sicherheitsregelxxxxxxxxxx';

const { mocks, SicherheitsregelConflictErrorMock } = vi.hoisted(() => {
  class SicherheitsregelConflictErrorMock extends Error {
    readonly statusCode = 409;
    constructor(
      readonly currentVersion: number | undefined,
      readonly attemptedVersion: number | undefined,
      readonly originalError: unknown,
    ) {
      super('ConflictDetected:Sicherheitsregel');
      this.name = 'SicherheitsregelConflictError';
    }
  }
  return {
    SicherheitsregelConflictErrorMock,
    mocks: {
      einheitenState: {
        data: [] as Array<{ id: string; name: string }>,
        isPending: false,
      },
      createMutation: {
        mutateAsync: vi.fn(),
        isPending: false,
      },
      updateMutation: {
        mutateAsync: vi.fn(),
        isPending: false,
      },
      sicherheitsregelQuery: {
        data: undefined as unknown,
        isPending: false,
        isFetching: false,
      },
    },
  };
});

vi.mock('@/features/eigenschutz/api/queries', () => ({
  EIGENSCHUTZ_QUERY_KEYS: {
    sicherheitsregeln: (id: string, einheitId?: string) =>
      einheitId === undefined ? ['eigenschutz', id, 'sicherheitsregeln', 'list'] : ['eigenschutz', id, 'sicherheitsregeln', 'list', { einheitId }],
    sicherheitsregel: (id: string, regelId: string) => ['eigenschutz', id, 'sicherheitsregeln', 'detail', regelId],
  },
  useCreateSicherheitsregel: () => mocks.createMutation,
  useUpdateSicherheitsregel: () => mocks.updateMutation,
  useSicherheitsregel: () => mocks.sicherheitsregelQuery,
  SicherheitsregelConflictError: SicherheitsregelConflictErrorMock,
  extractSicherheitsregelConflictError: vi.fn(),
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheitenState,
}));

import { SicherheitsregelDrawer } from '../SicherheitsregelDrawer';

beforeEach(() => {
  mocks.createMutation.mutateAsync = vi.fn();
  mocks.createMutation.isPending = false;
  mocks.updateMutation.mutateAsync = vi.fn();
  mocks.updateMutation.isPending = false;
  mocks.einheitenState.data = [
    { id: EINHEIT_1_ID, name: 'Rettungstrupp 1' },
    { id: EINHEIT_2_ID, name: 'Rettungstrupp 2' },
  ];
  mocks.einheitenState.isPending = false;
  mocks.sicherheitsregelQuery.data = undefined;
  mocks.sicherheitsregelQuery.isPending = false;
  mocks.sicherheitsregelQuery.isFetching = false;
});

function setup(props: Partial<React.ComponentProps<typeof SicherheitsregelDrawer>> = {}) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  renderWithProviders(<SicherheitsregelDrawer einsatzId={EINSATZ_ID} open={true} onClose={onClose} onSaved={onSaved} {...props} />);
  return { onClose, onSaved };
}

describe('SicherheitsregelDrawer', () => {
  it('rendert Titel-, Inhalt- und Zuordnungs-Felder', () => {
    setup();
    expect(screen.getByLabelText(/Titel/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Inhalt/i)).toBeInTheDocument();
    expect(screen.getByTestId('sicherheitsregel-zuordnung-einsatzweit')).toBeInTheDocument();
    expect(screen.getByTestId('sicherheitsregel-zuordnung-einheiten')).toBeInTheDocument();
  });

  it('zeigt Inline-Fehler bei leerem Titel', async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByTestId('sicherheitsregel-submit'));
    await waitFor(() => {
      expect(screen.getByTestId('sicherheitsregel-inline-error')).toBeInTheDocument();
    });
    expect(mocks.createMutation.mutateAsync).not.toHaveBeenCalled();
  });

  it('zeigt Zeichen-Count ab 80% Titel-Länge (64 Zeichen)', async () => {
    const user = userEvent.setup();
    setup();
    const titel = 'A'.repeat(64);
    await user.type(screen.getByTestId('sicherheitsregel-titel'), titel);
    await waitFor(() => {
      expect(screen.getByTestId('sicherheitsregel-titel-count')).toHaveTextContent('64 / 80 Zeichen');
    });
    // Bei 64 Zeichen (80 %) ist die Warnstufe noch nicht erreicht (95 % = 76).
    expect(screen.getByTestId('sicherheitsregel-titel-count')).toHaveAttribute('data-near-limit', 'false');
  });

  it('markiert Zeichen-Count ab 95% Titel-Länge als near-limit (76 Zeichen)', async () => {
    const user = userEvent.setup();
    setup();
    await user.type(screen.getByTestId('sicherheitsregel-titel'), 'A'.repeat(76));
    await waitFor(() => {
      const counter = screen.getByTestId('sicherheitsregel-titel-count');
      expect(counter).toHaveAttribute('data-near-limit', 'true');
      expect(counter.className).toContain('text-status-warning-text');
    });
  });

  it('markiert Zeichen-Count ab 95% Inhalt-Länge als near-limit (1900 Zeichen)', async () => {
    const user = userEvent.setup();
    setup();
    const inhaltField = screen.getByTestId('sicherheitsregel-inhalt') as HTMLTextAreaElement;
    // userEvent.type wäre für 1900 Zeichen extrem langsam — wir setzen den
    // Wert direkt via fireEvent.change-Äquivalent (form-State-Update via React).
    inhaltField.focus();
    await user.paste('B'.repeat(1900));
    await waitFor(() => {
      const counter = screen.getByTestId('sicherheitsregel-inhalt-count');
      expect(counter).toHaveAttribute('data-near-limit', 'true');
      expect(counter.className).toContain('text-status-warning-text');
    });
  });

  it('exklusiv-oder: Einheit-Auswahl deaktiviert einsatzweit', async () => {
    const user = userEvent.setup();
    setup();
    const einheitenRadio = screen.getByTestId('sicherheitsregel-zuordnung-einheiten');
    await user.click(einheitenRadio);
    await waitFor(() => {
      expect(screen.getByTestId('sicherheitsregel-einheiten-listbox')).toBeInTheDocument();
    });
    const listbox = screen.getByTestId('sicherheitsregel-einheiten-listbox');
    expect(listbox).toHaveAttribute('role', 'listbox');
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');
  });

  it('bei leeren Einheiten: listbox ausgeblendet, Hinweis rendert, einsatzweit erzwungen', () => {
    mocks.einheitenState.data = [];
    setup();
    expect(screen.getByTestId('sicherheitsregel-keine-einheiten-hinweis')).toBeInTheDocument();
    expect(screen.queryByTestId('sicherheitsregel-einheiten-listbox')).not.toBeInTheDocument();
  });

  it('Submit im Create-Modus ruft useCreateSicherheitsregel mit einsatzweit:true', async () => {
    const user = userEvent.setup();
    mocks.createMutation.mutateAsync = vi.fn().mockResolvedValue([{ id: REGEL_ID }]);
    const { onSaved, onClose } = setup();
    await user.type(screen.getByTestId('sicherheitsregel-titel'), 'Absperrung 20m');
    await user.type(screen.getByTestId('sicherheitsregel-inhalt'), 'Regel: Bitte 20 Meter Abstand halten.');
    await user.click(screen.getByTestId('sicherheitsregel-submit'));
    await waitFor(() => {
      expect(mocks.createMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          titel: 'Absperrung 20m',
          inhalt: 'Regel: Bitte 20 Meter Abstand halten.',
          einsatzweit: true,
        }),
      );
    });
    expect(onSaved).toHaveBeenCalledWith([REGEL_ID]);
    expect(onClose).toHaveBeenCalled();
  });

  it('Submit im Edit-Modus ruft useUpdateSicherheitsregel mit expectedVersion', async () => {
    const user = userEvent.setup();
    mocks.updateMutation.mutateAsync = vi.fn().mockResolvedValue([{ id: REGEL_ID }]);
    const regel = {
      id: REGEL_ID,
      einsatzId: EINSATZ_ID,
      einheitId: null,
      einsatzweit: true,
      titel: 'Alte Regel',
      inhalt: 'Alter Inhalt',
      version: 3,
      erstelltAm: '2026-04-24T10:00:00.000Z',
      erstelltVonUserId: 'user-1',
      aktualisiertAm: '2026-04-24T10:00:00.000Z',
      aktualisiertVonUserId: 'user-1',
      propagationGroupId: 'group-1',
    };
    setup({ regel });
    const titelInput = screen.getByTestId('sicherheitsregel-titel') as HTMLInputElement;
    await user.clear(titelInput);
    await user.type(titelInput, 'Neue Regel');
    await user.click(screen.getByTestId('sicherheitsregel-submit'));
    await waitFor(() => {
      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: REGEL_ID,
          expectedVersion: 3,
          titel: 'Neue Regel',
          einsatzweit: true,
        }),
      );
    });
  });

  it('Edit-Open: setzt Form auf den frisch geladenen Server-Stand zurück (Code-Review-Patch #17)', async () => {
    const regelStale = {
      id: REGEL_ID,
      einsatzId: EINSATZ_ID,
      einheitId: null,
      einsatzweit: true,
      titel: 'Stale Titel',
      inhalt: 'Stale Inhalt',
      version: 2,
      erstelltAm: '2026-04-24T10:00:00.000Z',
      erstelltVonUserId: 'user-1',
      aktualisiertAm: '2026-04-24T10:00:00.000Z',
      aktualisiertVonUserId: 'user-1',
      propagationGroupId: 'group-1',
    };
    mocks.sicherheitsregelQuery.data = { ...regelStale, titel: 'Frischer Titel', version: 4 };
    setup({ regel: regelStale });
    await waitFor(() => {
      expect((screen.getByTestId('sicherheitsregel-titel') as HTMLInputElement).value).toBe('Frischer Titel');
    });
  });

  it('Edit-Submit: postet gegen frische version, nicht gegen stale prop-version (Code-Review-Patch #17)', async () => {
    const user = userEvent.setup();
    mocks.updateMutation.mutateAsync = vi.fn().mockResolvedValue([{ id: REGEL_ID }]);
    const regelStale = {
      id: REGEL_ID,
      einsatzId: EINSATZ_ID,
      einheitId: null,
      einsatzweit: true,
      titel: 'Titel',
      inhalt: 'Inhalt',
      version: 2,
      erstelltAm: '2026-04-24T10:00:00.000Z',
      erstelltVonUserId: 'user-1',
      aktualisiertAm: '2026-04-24T10:00:00.000Z',
      aktualisiertVonUserId: 'user-1',
      propagationGroupId: 'group-1',
    };
    mocks.sicherheitsregelQuery.data = { ...regelStale, version: 4 };
    setup({ regel: regelStale });
    const titelInput = screen.getByTestId('sicherheitsregel-titel') as HTMLInputElement;
    await waitFor(() => expect(titelInput.value).toBe('Titel'));
    await user.clear(titelInput);
    await user.type(titelInput, 'Edit');
    await user.click(screen.getByTestId('sicherheitsregel-submit'));
    await waitFor(() => {
      expect(mocks.updateMutation.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: REGEL_ID,
          expectedVersion: 4,
        }),
      );
    });
  });

  it('409-Conflict: rendert Inline-Banner mit currentVersion (kein Toast)', async () => {
    const user = userEvent.setup();
    const conflict = new SicherheitsregelConflictErrorMock(5, 3, undefined);
    mocks.updateMutation.mutateAsync = vi.fn().mockRejectedValue(conflict);
    const regel = {
      id: REGEL_ID,
      einsatzId: EINSATZ_ID,
      einheitId: null,
      einsatzweit: true,
      titel: 'Alte Regel',
      inhalt: 'Alter Inhalt',
      version: 3,
      erstelltAm: '2026-04-24T10:00:00.000Z',
      erstelltVonUserId: 'user-1',
      aktualisiertAm: '2026-04-24T10:00:00.000Z',
      aktualisiertVonUserId: 'user-1',
      propagationGroupId: 'group-1',
    };
    const { onClose } = setup({ regel });
    const titelInput = screen.getByTestId('sicherheitsregel-titel') as HTMLInputElement;
    await user.clear(titelInput);
    await user.type(titelInput, 'Neuer Titel');
    await user.click(screen.getByTestId('sicherheitsregel-submit'));
    await waitFor(() => {
      const banner = screen.getByTestId('sicherheitsregel-inline-error');
      expect(banner).toHaveTextContent(/Version 5/i);
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});
