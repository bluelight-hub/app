/**
 * Spec für `SicherungspostenDetailPage` (Story 4.4 Task 3, AC4 + AC10).
 *
 * Schwerpunkte:
 * - Loading-Skeleton, Generic-Error-Banner mit Retry, 404-Banner mit
 *   Link-zur-Liste.
 * - Erfolgs-Render: Header, Version-Badge, Aufgelöst-Badge.
 * - Footer-Aktions-Bar: Bearbeiten öffnet Drawer, Auflösen öffnet Dialog,
 *   „Auf Karte zeigen" navigiert mit `focus`-Search; disabled für
 *   Address-only-Posten.
 *
 * Drawer und Dialog werden gemockt, damit die DetailPage-Spec deren
 * interne Logik nicht erneut prüft (haben eigene Specs).
 */

import { renderWithProviders } from '@/test/utils';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mocks } = vi.hoisted(() => ({
  mocks: {
    detailQuery: {
      data: undefined as unknown,
      error: undefined as unknown,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    },
    navigate: vi.fn(),
    drawerCalls: [] as Array<{ mode: string; open: boolean; postenId: string | null }>,
    aufloeseCalls: [] as Array<{ postenId: string | null }>,
  },
}));

vi.mock('@/features/eigenschutz/api/use-sicherungsposten', () => ({
  useGetSicherungsposten: () => mocks.detailQuery,
}));

vi.mock('@tanstack/react-router', async () => {
  const actual = await vi.importActual<typeof import('@tanstack/react-router')>('@tanstack/react-router');
  return {
    ...actual,
    useNavigate: () => mocks.navigate,
    Link: ({ to, params, children, ...rest }: { to: string; params?: Record<string, string>; children: React.ReactNode } & Record<string, unknown>) => (
      <a data-mock-link data-to={to} data-params={JSON.stringify(params ?? {})} {...rest}>
        {children}
      </a>
    ),
  };
});

vi.mock('../../organisms/SicherungspostenDrawer', () => ({
  SicherungspostenDrawer: ({ mode, open, posten, onClose }: { mode: string; open: boolean; posten?: { id: string }; onClose: () => void }) => {
    mocks.drawerCalls.push({ mode, open, postenId: posten?.id ?? null });
    if (!open) return null;
    return (
      <div data-testid="drawer-stub" data-mode={mode} data-posten-id={posten?.id ?? ''}>
        <button type="button" onClick={onClose} data-testid="drawer-close-stub">
          close
        </button>
      </div>
    );
  },
}));

vi.mock('../../organisms/AufloeseSicherungspostenDialog', () => ({
  AufloeseSicherungspostenDialog: ({ posten, onClose }: { posten: { id: string } | null; onClose: () => void }) => {
    mocks.aufloeseCalls.push({ postenId: posten?.id ?? null });
    if (!posten) return null;
    return (
      <div data-testid="aufloese-dialog-stub" data-posten-id={posten.id}>
        <button type="button" onClick={onClose} data-testid="aufloese-close-stub">
          close
        </button>
      </div>
    );
  },
}));

import { SicherungspostenDetailPage } from '../SicherungspostenDetailPage';

const POSTEN_BASIS = {
  id: 'posten-1',
  einsatzId: 'einsatz-1',
  bezeichnung: 'Eingang Hörsaal C',
  standort: { kind: 'address', text: 'Hörsaal C, Eingang West' },
  personal: [],
  version: 3,
  erstelltAm: '2026-05-01T10:00:00.000Z',
  erstelltVonUserId: 'user-erst-12345',
  aktualisiertAm: '2026-05-02T08:30:00.000Z',
  aktualisiertVonUserId: 'user-akt-67890',
};

beforeEach(() => {
  mocks.detailQuery.data = undefined;
  mocks.detailQuery.error = undefined;
  mocks.detailQuery.isPending = true;
  mocks.detailQuery.isError = false;
  mocks.detailQuery.refetch = vi.fn();
  mocks.navigate = vi.fn();
  mocks.drawerCalls = [];
  mocks.aufloeseCalls = [];
});

describe('SicherungspostenDetailPage', () => {
  it('rendert Loading-Skeleton solange isPending', () => {
    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);
    expect(screen.getByTestId('sicherungsposten-detail-loading')).toBeInTheDocument();
  });

  it('rendert Header mit Bezeichnung + v{version} (kein Aufgelöst-Badge bei aktivem Posten)', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = POSTEN_BASIS;

    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    expect(screen.getByRole('heading', { level: 1, name: /Eingang Hörsaal C/ })).toBeInTheDocument();
    expect(screen.getByTestId('sicherungsposten-detail-version-badge')).toHaveTextContent('v3');
    expect(screen.queryByTestId('sicherungsposten-detail-aufgeloest-badge')).not.toBeInTheDocument();
  });

  it('Mikro-Footer rendert userIdHash6 als 6-stelligen Hex-Hash (kein Klar-CUID-Substring) (AC4)', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = POSTEN_BASIS;

    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    const meta = screen.getByTestId('sicherungsposten-detail-meta');
    // Erwartet: „Zuletzt aktualisiert: HH:MM dd.MM.yyyy (von <hash6>)"
    // hash6 ist 6 hexadezimale Zeichen [0-9a-f] und NICHT der Klar-CUID-Anfang.
    const match = meta.textContent?.match(/\(von ([0-9a-f]{6})\)/);
    expect(match).not.toBeNull();
    const hash = match?.[1];
    expect(hash).toMatch(/^[0-9a-f]{6}$/);
    // Privacy-Check: Klar-CUID-Anfang darf NICHT geleakt werden.
    expect(hash).not.toBe(POSTEN_BASIS.aktualisiertVonUserId.slice(0, 6));
  });

  it('Mikro-Footer ist deterministisch — gleicher User → gleicher Hash', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = POSTEN_BASIS;
    const { unmount, container: c1 } = renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);
    const meta1 = c1.querySelector('[data-testid="sicherungsposten-detail-meta"]')?.textContent ?? '';
    unmount();

    const { container: c2 } = renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);
    const meta2 = c2.querySelector('[data-testid="sicherungsposten-detail-meta"]')?.textContent ?? '';

    const hash1 = meta1.match(/\(von ([0-9a-f]{6})\)/)?.[1];
    const hash2 = meta2.match(/\(von ([0-9a-f]{6})\)/)?.[1];
    expect(hash1).toBeTruthy();
    expect(hash1).toBe(hash2);
  });

  it('rendert Aufgelöst-Badge wenn aufgeloestAm gesetzt ist', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = { ...POSTEN_BASIS, aufgeloestAm: '2026-05-03T12:00:00.000Z' };

    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    expect(screen.getByTestId('sicherungsposten-detail-aufgeloest-badge')).toBeInTheDocument();
    // Aufgelöste Posten dürfen keine Edit-/Auflöse-/Show-on-Map-Buttons mehr anbieten.
    expect(screen.queryByTestId('sicherungsposten-detail-edit')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sicherungsposten-detail-aufloesen')).not.toBeInTheDocument();
    expect(screen.queryByTestId('sicherungsposten-detail-show-on-map')).not.toBeInTheDocument();
  });

  it('404-Path: Banner mit „existiert nicht" + Link zur Liste', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.isError = true;
    mocks.detailQuery.error = { response: { status: 404 } };

    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    const banner = screen.getByTestId('sicherungsposten-detail-not-found');
    expect(banner).toHaveTextContent(/existiert nicht oder gehört/);
    const back = screen.getByTestId('sicherungsposten-detail-not-found-back');
    expect(back).toHaveAttribute('data-to', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/sicherungsposten');
    expect(JSON.parse(back.getAttribute('data-params') ?? '{}')).toEqual({ einsatzId: 'einsatz-1' });
  });

  it('Generic-Error-Path: Banner mit Retry-Button → triggert refetch', async () => {
    const refetch = vi.fn();
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.isError = true;
    mocks.detailQuery.error = { response: { status: 500 } };
    mocks.detailQuery.refetch = refetch;

    const user = userEvent.setup();
    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    const banner = screen.getByTestId('sicherungsposten-detail-error');
    expect(banner).toHaveTextContent(/konnte nicht geladen werden/);
    await user.click(screen.getByTestId('sicherungsposten-detail-retry'));
    expect(refetch).toHaveBeenCalled();
  });

  it('„Bearbeiten"-Klick öffnet SicherungspostenDrawer mit mode="edit" und posten={data}', async () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = POSTEN_BASIS;

    const user = userEvent.setup();
    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    expect(screen.queryByTestId('drawer-stub')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('sicherungsposten-detail-edit'));

    const drawer = await screen.findByTestId('drawer-stub');
    expect(drawer).toHaveAttribute('data-mode', 'edit');
    expect(drawer).toHaveAttribute('data-posten-id', POSTEN_BASIS.id);
  });

  it('„Auflösen"-Klick öffnet AufloeseSicherungspostenDialog', async () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = POSTEN_BASIS;

    const user = userEvent.setup();
    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    expect(screen.queryByTestId('aufloese-dialog-stub')).not.toBeInTheDocument();
    await user.click(screen.getByTestId('sicherungsposten-detail-aufloesen'));

    const dialog = await screen.findByTestId('aufloese-dialog-stub');
    expect(dialog).toHaveAttribute('data-posten-id', POSTEN_BASIS.id);
  });

  it('„Auf Karte zeigen"-Klick navigiert mit focus="sicherungsposten:<id>"', async () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = {
      ...POSTEN_BASIS,
      standort: { kind: 'coordinate', longitude: 10.5, latitude: 51.2 },
    };

    const user = userEvent.setup();
    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    const button = screen.getByTestId('sicherungsposten-detail-show-on-map');
    expect(button).not.toBeDisabled();
    await user.click(button);

    expect(mocks.navigate).toHaveBeenCalledTimes(1);
    const arg = mocks.navigate.mock.calls[0][0];
    expect(arg.to).toBe('/app/einsatz/$einsatzId/übersicht/karte');
    expect(arg.params).toEqual({ einsatzId: 'einsatz-1' });
    expect(arg.search({ vorhanden: true })).toEqual({ vorhanden: true, focus: `sicherungsposten:${POSTEN_BASIS.id}` });
  });

  it('„Auf Karte zeigen" ist disabled, wenn standort.kind === "address"', () => {
    mocks.detailQuery.isPending = false;
    mocks.detailQuery.data = POSTEN_BASIS; // address-Variante

    renderWithProviders(<SicherungspostenDetailPage einsatzId="einsatz-1" id="posten-1" />);

    const button = screen.getByTestId('sicherungsposten-detail-show-on-map');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', expect.stringContaining('Kein Standort hinterlegt'));
  });
});
