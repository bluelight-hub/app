import { act, fireEvent, renderWithProviders, screen, within } from '@/test/utils';
import type { AnchorHTMLAttributes } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SingleEinsatzDashboard } from '@/features/einsatz/ui/organisms/SingleEinsatzDashboard';

const { mockSetActiveEinsatz, mockIsWorkspaceRouteAccessible, mockNavigate, mockDashboardState } = vi.hoisted(() => ({
  mockSetActiveEinsatz: vi.fn(),
  mockIsWorkspaceRouteAccessible: vi.fn(() => true),
  mockNavigate: vi.fn(),
  mockDashboardState: {
    isLoading: false,
    isFetching: false,
    error: null as Error | null,
    einsatz: {
      id: 'einsatz-1',
      nummer: 'E2026-001',
      name: 'Wohnungsbrand Musterstraße',
      alarmstichwort: 'B3Y',
      status: 'IN_BEARBEITUNG',
      einsatzort: {
        strasse: 'Musterstraße',
        hausnummer: '7',
        plz: '12345',
        ort: 'Teststadt',
      },
      alarmierungszeit: '2026-03-16T11:45:00.000Z',
      createdAt: new Date('2026-03-16T11:40:00.000Z'),
      bemerkung: 'Starke Rauchentwicklung im zweiten Obergeschoss.',
    },
    etb: {
      id: 'etb-1',
      einsatzId: 'einsatz-1',
      status: 'ACTIVE',
      eintraege: [
        {
          id: 'entry-1',
          text: 'Wasserversorgung steht, Innenangriff läuft weiter.',
          kategorie: 'LAGE',
          timestamp: new Date('2026-03-16T12:00:00.000Z'),
          absender: 'Führung 1',
        },
      ],
      version: {},
      createdAt: new Date('2026-03-16T11:45:00.000Z'),
    },
    lagekarte: {
      id: 'lage-1',
      einsatzId: 'einsatz-1',
      pois: [{ id: 'poi-1' }, { id: 'poi-2' }],
      createdAt: new Date('2026-03-16T11:50:00.000Z'),
    },
    fahrzeuge: [
      { id: 'fahrzeug-1', funkrufname: 'Florian 1/44/1', kennzeichen: 'BL-01', fmsStatus: 4 },
      { id: 'fahrzeug-2', funkrufname: 'Florian 1/44/2', kennzeichen: 'BL-02', fmsStatus: 3 },
    ],
    isLoadingFahrzeuge: false,
    isFetchingFahrzeuge: false,
  },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();

  return {
    ...actual,
    Link: ({ children, to, search, onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement> & { to?: string; search?: unknown }) => (
      <a href={to} data-preserves-search={typeof search === 'function' ? 'true' : undefined} onClick={onClick} {...props}>
        {children}
      </a>
    ),
    useParams: () => ({ einsatzId: 'einsatz-1' }),
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@/features/auth/api/use-users', () => ({
  useUserNames: () => ({
    getUserName: (id: string) => `TestUser-${id.slice(0, 4)}`,
    getUserNames: (ids: string | string[]) => (typeof ids === 'string' ? `TestUser-${ids.slice(0, 4)}` : ids.map((id) => `TestUser-${id.slice(0, 4)}`)),
    userMap: new Map(),
  }),
}));

vi.mock('@/features/workspace', () => ({
  isWorkspaceRouteAccessible: mockIsWorkspaceRouteAccessible,
}));

const { mockToastError } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: { error: mockToastError },
}));

vi.mock('@/features/einsatz', () => ({
  FMS_STATUS_LABELS: {
    3: 'Einsatzbereit auf Wache',
    4: 'Ankunft an Einsatzstelle',
  },
  useActiveEinsatz: () => ({
    activeEinsatz: null,
    setActiveEinsatz: mockSetActiveEinsatz,
    isEinsatzActive: false,
  }),
  useEinsatzDetails: () => ({
    einsatz: mockDashboardState.einsatz,
    etb: mockDashboardState.etb,
    lagekarte: mockDashboardState.lagekarte,
    isLoading: mockDashboardState.isLoading,
    isFetching: mockDashboardState.isFetching,
    error: mockDashboardState.error,
    data: undefined,
  }),
  useEinsatzFahrzeuge: () => ({
    data: mockDashboardState.fahrzeuge,
    isLoading: mockDashboardState.isLoadingFahrzeuge,
    isFetching: mockDashboardState.isFetchingFahrzeuge,
  }),
}));

describe('SingleEinsatzDashboard', () => {
  beforeEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
    mockIsWorkspaceRouteAccessible.mockReturnValue(true);

    Object.assign(mockDashboardState, {
      isLoading: false,
      isFetching: false,
      error: null,
      einsatz: {
        id: 'einsatz-1',
        nummer: 'E2026-001',
        name: 'Wohnungsbrand Musterstraße',
        alarmstichwort: 'B3Y',
        status: 'IN_BEARBEITUNG',
        einsatzort: {
          strasse: 'Musterstraße',
          hausnummer: '7',
          plz: '12345',
          ort: 'Teststadt',
        },
        alarmierungszeit: '2026-03-16T11:45:00.000Z',
        createdAt: new Date('2026-03-16T11:40:00.000Z'),
        bemerkung: 'Starke Rauchentwicklung im zweiten Obergeschoss.',
      },
      etb: {
        id: 'etb-1',
        einsatzId: 'einsatz-1',
        status: 'ACTIVE',
        eintraege: [
          {
            id: 'entry-1',
            text: 'Wasserversorgung steht, Innenangriff läuft weiter.',
            kategorie: 'LAGE',
            timestamp: new Date('2026-03-16T12:00:00.000Z'),
            absender: 'Führung 1',
          },
        ],
        version: {},
        createdAt: new Date('2026-03-16T11:45:00.000Z'),
      },
      lagekarte: {
        id: 'lage-1',
        einsatzId: 'einsatz-1',
        pois: [{ id: 'poi-1' }, { id: 'poi-2' }],
        createdAt: new Date('2026-03-16T11:50:00.000Z'),
      },
      fahrzeuge: [
        { id: 'fahrzeug-1', funkrufname: 'Florian 1/44/1', kennzeichen: 'BL-01', fmsStatus: 4 },
        { id: 'fahrzeug-2', funkrufname: 'Florian 1/44/2', kennzeichen: 'BL-02', fmsStatus: 3 },
      ],
      isLoadingFahrzeuge: false,
      isFetchingFahrzeuge: false,
    });
  });

  it('rendert priorisierte Signale und zulässige Quick Actions in einer gemeinsamen Fokusfläche', () => {
    renderWithProviders(<SingleEinsatzDashboard />);

    const dashboardRegion = screen.getByRole('region', { name: 'Einsatz-Dashboard' });
    const directAccessSection = screen.getByRole('heading', { name: 'Direktzugriffe' }).closest('section');

    expect(dashboardRegion).toBeInTheDocument();
    expect(within(dashboardRegion).getByRole('heading', { name: 'Lagebild' })).toBeInTheDocument();
    expect(within(dashboardRegion).getByText('Fokus')).toBeInTheDocument();
    expect(within(dashboardRegion).getByText('Dauer')).toBeInTheDocument();
    expect(within(dashboardRegion).getAllByText('ETB').length).toBeGreaterThan(0);
    expect(within(dashboardRegion).getAllByText('Ortsmarken').length).toBeGreaterThan(0);
    expect(within(dashboardRegion).getAllByText('Kräfte').length).toBeGreaterThan(0);
    expect(within(dashboardRegion).getByRole('img', { name: 'ETB-Aktivität' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Ressourcenverteilung' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Einsatzinformationen' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ressourcenlage' })).toBeInTheDocument();

    expect(directAccessSection).not.toBeNull();
    expect(within(directAccessSection as HTMLElement).getByText('ETB')).toBeInTheDocument();
    expect(within(directAccessSection as HTMLElement).getByText('Lagekarte')).toBeInTheDocument();
    expect(within(directAccessSection as HTMLElement).getByText('Kräfte-Dashboard')).toBeInTheDocument();
    expect(within(directAccessSection as HTMLElement).getAllByText('Direkt verfügbar')).toHaveLength(3);

    const links = within(directAccessSection as HTMLElement).getAllByRole('link');
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute('href', '/app/einsatz/$einsatzId/führung/etb');
    expect(links[0]).toHaveAttribute('data-preserves-search', 'true');
    expect(links[1]).toHaveAttribute('href', '/app/einsatz/$einsatzId/übersicht/karte');
    expect(links[2]).toHaveAttribute('href', '/app/einsatz/$einsatzId/kräfte/dashboard');
    expect(mockSetActiveEinsatz).toHaveBeenCalledWith('einsatz-1');
  });

  it('fällt auf Beobachtung zurück, wenn Zielbereiche nicht direkt freigegeben sind', () => {
    mockIsWorkspaceRouteAccessible.mockReturnValue(false);
    Object.assign(mockDashboardState, {
      etb: {
        id: 'etb-1',
        einsatzId: 'einsatz-1',
        status: 'ACTIVE',
        eintraege: [],
        version: {},
        createdAt: new Date('2026-03-16T11:45:00.000Z'),
      },
      lagekarte: {
        id: 'lage-1',
        einsatzId: 'einsatz-1',
        pois: [],
        createdAt: new Date('2026-03-16T11:50:00.000Z'),
      },
      fahrzeuge: [],
    });

    renderWithProviders(<SingleEinsatzDashboard />);

    const directAccessSection = screen.getByRole('heading', { name: 'Direktzugriffe' }).closest('section');

    expect(screen.getByText('Fokus')).toBeInTheDocument();
    expect(screen.getByText('Dokumentation offen')).toBeInTheDocument();
    expect(screen.getByText('Noch keine ETB-Aktivität vorhanden.')).toBeInTheDocument();
    expect(screen.getByText('Noch keine Ressourcen im Überblick verfügbar.')).toBeInTheDocument();
    expect(directAccessSection).not.toBeNull();
    expect(within(directAccessSection as HTMLElement).queryAllByRole('link')).toHaveLength(0);
    expect(within(directAccessSection as HTMLElement).getAllByText('Weiter beobachten')).toHaveLength(3);
  });

  it('zeigt einen semantischen Aktualisierungszustand erst nach 300 Millisekunden an', () => {
    vi.useFakeTimers();
    Object.assign(mockDashboardState, {
      isFetching: true,
      isFetchingFahrzeuge: true,
    });

    renderWithProviders(<SingleEinsatzDashboard />);

    expect(screen.queryByText(/Lageübersicht wird aktualisiert/)).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.getByText(/Lageübersicht wird aktualisiert/)).toBeInTheDocument();
  });

  // --- Story 2.4: Direktnavigation aus Übersichtselementen ---

  describe('Story 2.4: Direktnavigation', () => {
    it('rendert ETB-Meldungen als klickbare Links zum ETB wenn verfügbar (AC1, AC2)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const links = within(meldungenSection).getAllByRole('link');

      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/app/einsatz/$einsatzId/führung/etb');
      expect(links[0]).toHaveAttribute('data-preserves-search', 'true');
    });

    it('rendert ETB-Meldungen mit sr-only Navigations-Label (AC5)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      expect(screen.getByText('Zum ETB wechseln')).toBeInTheDocument();
    });

    it('rendert Fahrzeug-Vorschau als klickbare Links zum Kräfte-Dashboard (AC1)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const ressourcenSection = screen.getByRole('heading', { name: 'Ressourcenlage' }).closest('section') as HTMLElement;
      const vehicleLinks = within(ressourcenSection).getAllByRole('link');

      expect(vehicleLinks.length).toBeGreaterThanOrEqual(2);
      expect(vehicleLinks[0]).toHaveAttribute('href', '/app/einsatz/$einsatzId/kräfte/dashboard');
      expect(vehicleLinks[0]).toHaveAttribute('data-preserves-search', 'true');
    });

    it('zeigt Pfeil-Icon als visuellen Sprung-Hinweis bei klickbaren Elementen', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const link = within(meldungenSection).getAllByRole('link')[0];
      const arrowIcons = link.querySelectorAll('[aria-hidden="true"]');

      expect(arrowIcons.length).toBeGreaterThan(0);
    });

    it('rendert ETB-Meldungen NICHT als Links wenn Zielbereich nicht verfügbar (AC3)', () => {
      mockIsWorkspaceRouteAccessible.mockReturnValue(false);

      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      expect(within(meldungenSection).queryAllByRole('link')).toHaveLength(0);
    });

    it('zeigt Übergabestatus-Text bei nicht-verfügbaren Meldungen (AC3)', () => {
      mockIsWorkspaceRouteAccessible.mockReturnValue(false);

      renderWithProviders(<SingleEinsatzDashboard />);

      expect(screen.getAllByText(/nicht zugänglich/).length).toBeGreaterThan(0);
    });

    it('rendert Fahrzeuge als nicht-klickbare Divs mit reduzierter Opazität wenn nicht verfügbar (AC3)', () => {
      mockIsWorkspaceRouteAccessible.mockReturnValue(false);

      renderWithProviders(<SingleEinsatzDashboard />);

      const ressourcenSection = screen.getByRole('heading', { name: 'Ressourcenlage' }).closest('section') as HTMLElement;
      expect(within(ressourcenSection).queryAllByRole('link')).toHaveLength(0);
      expect(within(ressourcenSection).getByText('Florian 1/44/1')).toBeInTheDocument();
    });

    it('zeigt Fehler-Toast wenn guardNavigation Berechtigungs-Check fehlschlägt (AC4)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const link = within(meldungenSection).getAllByRole('link')[0];

      // Jetzt schalten wir Accessibility auf false um — simuliert einen Race-Condition
      mockIsWorkspaceRouteAccessible.mockReturnValue(false);

      fireEvent.click(link);

      expect(mockToastError).toHaveBeenCalledWith(
        'Bereich nicht zugänglich',
        expect.objectContaining({
          description: 'Der Zielbereich ist derzeit nicht verfügbar.',
          action: expect.objectContaining({ label: 'Zur Übersicht' }),
        }),
      );
    });

    it('Fehler-Toast Fallback-Aktion navigiert zur Übersicht (AC4)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const link = within(meldungenSection).getAllByRole('link')[0];

      mockIsWorkspaceRouteAccessible.mockReturnValue(false);
      fireEvent.click(link);

      const toastCall = mockToastError.mock.calls[0];
      const actionOnClick = toastCall[1].action.onClick;
      actionOnClick();

      expect(mockNavigate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '/app/einsatz/$einsatzId/übersicht',
        }),
      );
    });

    it('alle klickbaren Elemente nutzen semantische <a>-Tags statt div+onClick (AC5)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const links = within(meldungenSection).getAllByRole('link');

      for (const link of links) {
        expect(link.tagName).toBe('A');
      }
    });

    it('klickbare Meldungen haben focus-visible Styling (AC5)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const link = within(meldungenSection).getAllByRole('link')[0];

      expect(link.className).toContain('focus-visible:shadow-focus-ring');
    });

    it('Space-Taste auf Navigations-Links löst guardNavigation aus (AC5)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const link = within(meldungenSection).getAllByRole('link')[0];

      mockIsWorkspaceRouteAccessible.mockReturnValue(false);
      fireEvent.keyDown(link, { key: ' ' });

      expect(mockToastError).toHaveBeenCalledWith('Bereich nicht zugänglich', expect.anything());
    });

    it('andere Tasten als Space lösen KEINE Navigation auf Links aus', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const link = within(meldungenSection).getAllByRole('link')[0];

      mockIsWorkspaceRouteAccessible.mockReturnValue(false);
      fireEvent.keyDown(link, { key: 'a' });

      expect(mockToastError).not.toHaveBeenCalled();
    });

    it('bewahrt search-Parameter bei allen Navigations-Links (AC2)', () => {
      renderWithProviders(<SingleEinsatzDashboard />);

      const meldungenSection = screen.getByRole('region', { name: 'Letzte Meldungen' });
      const meldungLinks = within(meldungenSection).getAllByRole('link');

      for (const link of meldungLinks) {
        expect(link).toHaveAttribute('data-preserves-search', 'true');
      }

      const ressourcenSection = screen.getByRole('heading', { name: 'Ressourcenlage' }).closest('section') as HTMLElement;
      const vehicleLinks = within(ressourcenSection).getAllByRole('link');

      for (const link of vehicleLinks) {
        expect(link).toHaveAttribute('data-preserves-search', 'true');
      }
    });
  });
});
