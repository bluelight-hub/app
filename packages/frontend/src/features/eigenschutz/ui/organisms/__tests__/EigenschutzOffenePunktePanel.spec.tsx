import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EigenschutzVorfallListItemDto, EinsatzEinheitDto } from '@bluelight-hub/shared/client';
import { EigenschutzOffenePunktePanel } from '../EigenschutzOffenePunktePanel';
import type { OffeneRueckmeldungEntry } from '../../../api/queries';

type QueryState<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
};

const { mocks } = vi.hoisted(() => ({
  mocks: {
    vorfaelle: { data: [], isLoading: false, isError: false } as QueryState<EigenschutzVorfallListItemDto[]>,
    rueckmeldungen: { data: [], isLoading: false, isError: false } as QueryState<OffeneRueckmeldungEntry[]>,
    einheiten: { data: [], isLoading: false, isError: false } as QueryState<Partial<EinsatzEinheitDto>[]>,
  },
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, params, children, ...rest }: { to: string; params?: Record<string, string>; children: React.ReactNode; [key: string]: unknown }) => (
    <a href={to} data-params={JSON.stringify(params ?? {})} {...(rest as Record<string, unknown>)}>
      {children}
    </a>
  ),
}));

vi.mock('../../../api/use-list-vorfaelle', () => ({
  useListVorfaelle: () => mocks.vorfaelle,
}));

vi.mock('../../../api/queries', () => ({
  useOffeneRueckmeldungen: () => mocks.rueckmeldungen,
}));

vi.mock('@/features/kraefte/api', () => ({
  useEinsatzEinheiten: () => mocks.einheiten,
}));

const EINSATZ_ID = 'einsatz-1';

function vorfall(id: string, overrides: Partial<EigenschutzVorfallListItemDto> = {}): EigenschutzVorfallListItemDto {
  return {
    id,
    einheitId: 'einheit-1',
    vorfallZeit: '2026-05-08T09:42:13.000Z',
    was: 'Kontaminierter Handschuh gemeldet',
    unfallkasseRelevant: true,
    erfasstAm: '2026-05-08T09:45:00.000Z',
    erfasstVonUserId: 'user-1',
    status: 'OFFEN',
    geschlossenAm: null,
    geschlossenVonUserId: null,
    ...overrides,
  };
}

function rueckmeldung(overrides: Partial<OffeneRueckmeldungEntry> = {}): OffeneRueckmeldungEntry {
  return {
    propagationGroupId: 'group-1',
    einsatzId: EINSATZ_ID,
    einheitId: 'einheit-1',
    lueckeNotiz: 'Filterpatrone fehlt',
    gemeldetAm: '2026-05-08T10:00:00.000Z',
    begruendungAnriss: 'CBRN-Lage',
    ...overrides,
  };
}

beforeEach(() => {
  mocks.vorfaelle = { data: [], isLoading: false, isError: false };
  mocks.rueckmeldungen = { data: [], isLoading: false, isError: false };
  mocks.einheiten = { data: [{ id: 'einheit-1', name: 'Abschnitt Nord' }], isLoading: false, isError: false };
});

describe('EigenschutzOffenePunktePanel', () => {
  it('rendert beide Sections im Inline-Panel', () => {
    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByTestId('eigenschutz-offene-punkte-panel')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Offene Vorfälle' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ungelöste Rückmeldungen' })).toBeInTheDocument();
  });

  it('zeigt getrennte Empty-States', () => {
    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByText('Keine offenen Vorfälle')).toBeInTheDocument();
    expect(screen.getByText('Keine ungelösten Rückmeldungen')).toBeInTheDocument();
  });

  it('rendert Vorfall-Eintrag mit UK-Badge und Detail-Link', () => {
    mocks.vorfaelle = { data: [vorfall('vorfall-1')], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    const item = screen.getByTestId('offener-vorfall-vorfall-1');
    expect(within(item).getByText('Kontaminierter Handschuh gemeldet')).toBeInTheDocument();
    expect(item).toHaveTextContent('Abschnitt Nord');
    expect(within(item).getByText('UK-relevant')).toBeInTheDocument();
    expect(within(item).getByTestId('uk-relevant-icon')).toBeInTheDocument();
    expect(within(item).getByRole('link', { name: /Öffnen/ })).toHaveAttribute('href', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/vorfaelle/$vorfallId');
  });

  it('sortiert Vorfälle defensiv nach vorfallZeit DESC und id DESC', () => {
    mocks.vorfaelle = {
      data: [vorfall('a', { was: 'Alt', vorfallZeit: '2026-05-08T08:00:00.000Z' }), vorfall('b', { was: 'Neu', vorfallZeit: '2026-05-08T10:00:00.000Z' })],
      isLoading: false,
      isError: false,
    };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    const items = screen.getAllByTestId(/^offener-vorfall-/);
    expect(items.map((item) => within(item).getByText(/Alt|Neu/).textContent)).toEqual(['Neu', 'Alt']);
  });

  it('zeigt den Begrenzungshinweis bei 200 Vorfällen', () => {
    mocks.vorfaelle = { data: Array.from({ length: 200 }, (_, index) => vorfall(`v-${index}`)), isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByText('Liste begrenzt')).toBeInTheDocument();
  });

  it('zeigt den Begrenzungshinweis bei 200 Rückmeldungen', () => {
    mocks.rueckmeldungen = { data: Array.from({ length: 200 }, (_, index) => rueckmeldung({ propagationGroupId: `group-${index}` })), isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    const section = screen.getByRole('heading', { name: 'Ungelöste Rückmeldungen' }).closest('section');
    expect(section).not.toBeNull();
    expect(within(section as HTMLElement).getByText('Liste begrenzt')).toBeInTheDocument();
  });

  it('zeigt die Gesamtsumme im Panel-Kopf', () => {
    mocks.vorfaelle = { data: [vorfall('vorfall-1'), vorfall('vorfall-2')], isLoading: false, isError: false };
    mocks.rueckmeldungen = { data: [rueckmeldung()], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    const panel = screen.getByTestId('eigenschutz-offene-punkte-panel');
    expect(within(panel).getByText('3')).toBeInTheDocument();
  });

  it('rendert Rückmeldung mit Einheit, Notiz und PSA-Link', () => {
    mocks.rueckmeldungen = { data: [rueckmeldung()], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    const item = screen.getByTestId('offene-rueckmeldung-group-1-einheit-1');
    expect(within(item).getByText('Filterpatrone fehlt')).toBeInTheDocument();
    expect(item).toHaveTextContent('Abschnitt Nord');
    expect(within(item).getByRole('link', { name: /Bearbeiten/ })).toHaveAttribute('href', '/app/einsatz/$einsatzId/sicherheit/eigenschutz/psa-profile');
  });

  it('zeigt Loading-States pro Abschnitt getrennt', () => {
    mocks.vorfaelle = { isLoading: true, isError: false };
    mocks.rueckmeldungen = { isLoading: true, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByText('Lade Vorfälle…')).toBeInTheDocument();
    expect(screen.getByText('Lade Rückmeldungen…')).toBeInTheDocument();
  });

  it('zeigt Fehler pro Abschnitt und lässt die andere Datenquelle sichtbar', () => {
    mocks.vorfaelle = { isLoading: false, isError: true };
    mocks.rueckmeldungen = { data: [rueckmeldung()], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Offene Vorfälle konnten nicht geladen werden.');
    expect(screen.getByText('Filterpatrone fehlt')).toBeInTheDocument();
  });

  it('zeigt Rückmeldungsfehler und lässt Vorfälle sichtbar', () => {
    mocks.vorfaelle = { data: [vorfall('vorfall-1')], isLoading: false, isError: false };
    mocks.rueckmeldungen = { isLoading: false, isError: true };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Ungelöste Rückmeldungen konnten nicht geladen werden.');
    expect(screen.getByText('Kontaminierter Handschuh gemeldet')).toBeInTheDocument();
  });

  it('kürzt lange Texte per title zugänglich', () => {
    const text = 'Sehr lange Rückmeldung mit mehreren Details zur fehlenden Ausrüstung und Nachforderung';
    mocks.rueckmeldungen = { data: [rueckmeldung({ lueckeNotiz: text })], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} />);

    expect(screen.getByText(text)).toHaveAttribute('title', text);
  });

  it('öffnet im Compact-Modus einen Dialog mit Close-Button', async () => {
    const user = userEvent.setup();
    mocks.vorfaelle = { data: [vorfall('vorfall-1')], isLoading: false, isError: false };
    mocks.rueckmeldungen = { data: [rueckmeldung()], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} mode="compact" />);

    const trigger = screen.getByRole('button', { name: '2 offene Punkte im Eigenschutz' });
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Offene Punkte' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /schließen/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('beschreibt den Compact-Trigger mit verständlichem aria-label', () => {
    mocks.vorfaelle = { data: [vorfall('vorfall-1')], isLoading: false, isError: false };
    mocks.rueckmeldungen = { data: [rueckmeldung()], isLoading: false, isError: false };

    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} mode="compact" />);

    expect(screen.getByRole('button', { name: '2 offene Punkte im Eigenschutz' })).toBeInTheDocument();
  });

  it('schließt den Compact-Dialog per Escape', async () => {
    const user = userEvent.setup();
    render(<EigenschutzOffenePunktePanel einsatzId={EINSATZ_ID} mode="compact" />);

    await user.click(screen.getByRole('button', { name: '0 offene Punkte im Eigenschutz' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
