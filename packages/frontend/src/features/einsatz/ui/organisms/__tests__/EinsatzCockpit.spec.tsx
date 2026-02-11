import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockUseEinsatzDetail = vi.fn();

let capturedOnConnectionStatusChange: ((isConnected: boolean) => void) | undefined;

vi.mock('@/features/reminders', () => ({
  ErinnerungenList: ({ einsatzId, onConnectionStatusChange }: { einsatzId: string; onConnectionStatusChange?: (isConnected: boolean) => void }) => {
    capturedOnConnectionStatusChange = onConnectionStatusChange;
    return (
      <div data-testid="erinnerungen-list" data-einsatz-id={einsatzId}>
        ErinnerungenList
      </div>
    );
  },
  useErinnerungenByEinsatz: () => ({ data: [], isLoading: false }),
  ErinnerungUebersicht: () => <div data-testid="erinnerung-uebersicht">ErinnerungUebersicht</div>,
  PersonStatistikTabelle: ({ einsatzId }: { einsatzId: string }) => <div data-testid="person-statistik">{einsatzId}</div>,
  ZeitverlaufDiagramm: ({ einsatzId }: { einsatzId: string }) => <div data-testid="zeitverlauf-diagramm">{einsatzId}</div>,
  EskalationsAnalyse: ({ einsatzId }: { einsatzId: string }) => <div data-testid="eskalations-analyse">{einsatzId}</div>,
  ReaktionszeitStatistik: ({ einsatzId }: { einsatzId: string }) => <div data-testid="reaktionszeit-statistik">{einsatzId}</div>,
  FuehrungsrhythmusStatistik: ({ einsatzId }: { einsatzId: string }) => <div data-testid="fuehrungsrhythmus-statistik">{einsatzId}</div>,
  EinsatzVergleich: ({ einsatzId }: { einsatzId: string }) => <div data-testid="einsatz-vergleich">{einsatzId}</div>,
  StatistikExportDialog: ({ isOpen }: { einsatzId: string; isOpen: boolean; onClose: () => void }) => (isOpen ? <div data-testid="export-dialog">ExportDialog</div> : null),
  RohdatenExportDialog: ({ isOpen }: { einsatzId: string; isOpen: boolean; onClose: () => void }) => (isOpen ? <div data-testid="rohdaten-export-dialog">RohdatenExportDialog</div> : null),
  LiveIndikator: ({ isConnected }: { isConnected: boolean }) => (
    <div data-testid="live-indikator" data-connected={isConnected}>
      {isConnected ? 'Live' : 'Disconnected'}
    </div>
  ),
}));

vi.mock('@/features/notizen', () => ({
  NotizList: ({ einsatzId }: { einsatzId: string }) => (
    <div data-testid="notiz-list" data-einsatz-id={einsatzId}>
      NotizList
    </div>
  ),
}));

vi.mock('../../../api/use-einsatz-detail', () => ({
  useEinsatzDetail: (...args: unknown[]) => mockUseEinsatzDetail(...args),
}));

import { act } from 'react';
import { EinsatzCockpit } from '../EinsatzCockpit';

describe('EinsatzCockpit', () => {
  const einsatzId = 'einsatz-123';

  beforeEach(() => {
    vi.clearAllMocks();
    capturedOnConnectionStatusChange = undefined;
    mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'IN_BEARBEITUNG' } });
  });

  it('should render both Zeitkritisch and Informationen sections', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByLabelText('Zeitkritisch')).toBeInTheDocument();
    expect(screen.getByLabelText('Informationen')).toBeInTheDocument();
  });

  it('should render section headers', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByText('Zeitkritisch')).toBeInTheDocument();
    expect(screen.getByText('Informationen')).toBeInTheDocument();
  });

  it('should render ErinnerungenList with correct einsatzId', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    const list = screen.getByTestId('erinnerungen-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-einsatz-id', einsatzId);
  });

  it('should render NotizList with correct einsatzId', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    const list = screen.getByTestId('notiz-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-einsatz-id', einsatzId);
  });

  it('should have responsive grid layout with lg:grid-cols-2', () => {
    // Given
    // When
    const { container } = render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    const grid = container.querySelector('.grid.grid-cols-1');
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-2');
  });

  it('should render ErinnerungUebersicht above the grid', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('erinnerung-uebersicht')).toBeInTheDocument();
  });

  it('should render ZeitverlaufDiagramm', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('zeitverlauf-diagramm')).toBeInTheDocument();
  });

  it('should render EskalationsAnalyse (Story 9.4)', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('eskalations-analyse')).toBeInTheDocument();
  });

  it('should render ReaktionszeitStatistik (Story 9.5)', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('reaktionszeit-statistik')).toBeInTheDocument();
  });

  it('should render FuehrungsrhythmusStatistik (Story 9.8)', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByTestId('fuehrungsrhythmus-statistik')).toBeInTheDocument();
  });

  it('should have accessible aria-labels on sections', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByLabelText('Zeitkritisch')).toBeInTheDocument();
    expect(screen.getByLabelText('Informationen')).toBeInTheDocument();
  });

  describe('Export-Buttons (Story 9.6 + 9.10)', () => {
    it('should render both export buttons', () => {
      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByRole('button', { name: /statistik export/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rohdaten export/i })).toBeInTheDocument();
    });

    it('should disable both export buttons when einsatz is IN_BEARBEITUNG', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'IN_BEARBEITUNG' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByRole('button', { name: /statistik export/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /rohdaten export/i })).toBeDisabled();
    });

    it('should enable both export buttons when einsatz is ABGESCHLOSSEN', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ABGESCHLOSSEN' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByRole('button', { name: /statistik export/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /rohdaten export/i })).toBeEnabled();
    });

    it('should enable both export buttons when einsatz is ARCHIVIERT', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ARCHIVIERT' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByRole('button', { name: /statistik export/i })).toBeEnabled();
      expect(screen.getByRole('button', { name: /rohdaten export/i })).toBeEnabled();
    });

    it('should show tooltip for disabled export buttons', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'IN_BEARBEITUNG' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByRole('button', { name: /statistik export/i })).toHaveAttribute('title', 'Export nur nach Einsatz-Ende verfuegbar');
      expect(screen.getByRole('button', { name: /rohdaten export/i })).toHaveAttribute('title', 'Export nur nach Einsatz-Ende verfuegbar');
    });

    it('should open statistik export dialog when statistik button is clicked', async () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ABGESCHLOSSEN' } });
      const user = userEvent.setup();

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);
      await user.click(screen.getByRole('button', { name: /statistik export/i }));

      // Then
      expect(screen.getByTestId('export-dialog')).toBeInTheDocument();
    });

    it('should open rohdaten export dialog when rohdaten button is clicked', async () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ABGESCHLOSSEN' } });
      const user = userEvent.setup();

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);
      await user.click(screen.getByRole('button', { name: /rohdaten export/i }));

      // Then
      expect(screen.getByTestId('rohdaten-export-dialog')).toBeInTheDocument();
    });

    it('should not show export dialogs initially', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ABGESCHLOSSEN' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.queryByTestId('export-dialog')).not.toBeInTheDocument();
      expect(screen.queryByTestId('rohdaten-export-dialog')).not.toBeInTheDocument();
    });
  });

  describe('WebSocket Live-Updates (Story 9.7)', () => {
    it('should pass onConnectionStatusChange to ErinnerungenList', () => {
      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(capturedOnConnectionStatusChange).toBeDefined();
      expect(typeof capturedOnConnectionStatusChange).toBe('function');
    });

    it('should show LiveIndikator when Einsatz is IN_BEARBEITUNG', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'IN_BEARBEITUNG' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByTestId('live-indikator')).toBeInTheDocument();
    });

    it('should show LiveIndikator when Einsatz is ANGELEGT', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ANGELEGT' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.getByTestId('live-indikator')).toBeInTheDocument();
    });

    it('should NOT show LiveIndikator when Einsatz is ABGESCHLOSSEN', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ABGESCHLOSSEN' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.queryByTestId('live-indikator')).not.toBeInTheDocument();
    });

    it('should NOT show LiveIndikator when Einsatz is ARCHIVIERT', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'ARCHIVIERT' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then
      expect(screen.queryByTestId('live-indikator')).not.toBeInTheDocument();
    });

    it('should update LiveIndikator when connection status changes via callback', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'IN_BEARBEITUNG' } });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then: Initially disconnected (default state)
      expect(screen.getByTestId('live-indikator')).toHaveAttribute('data-connected', 'false');

      // When: ErinnerungenList reports connection
      act(() => {
        capturedOnConnectionStatusChange?.(true);
      });

      // Then: LiveIndikator shows connected
      expect(screen.getByTestId('live-indikator')).toHaveAttribute('data-connected', 'true');
    });

    it('should show disconnect state after initial connection (edge-case)', () => {
      // Given
      mockUseEinsatzDetail.mockReturnValue({ einsatz: { status: 'IN_BEARBEITUNG' } });
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // When: Erst verbinden
      act(() => {
        capturedOnConnectionStatusChange?.(true);
      });

      // Then: "Live" angezeigt
      expect(screen.getByTestId('live-indikator')).toHaveTextContent('Live');

      // When: Dann Verbindung verlieren
      act(() => {
        capturedOnConnectionStatusChange?.(false);
      });

      // Then: "Disconnected" angezeigt
      expect(screen.getByTestId('live-indikator')).toHaveTextContent('Disconnected');
      expect(screen.getByTestId('live-indikator')).toHaveAttribute('data-connected', 'false');
    });

    it('should not render LiveIndikator and not crash when einsatz is undefined (loading state)', () => {
      // Given: useEinsatzDetail gibt undefined zurueck (Loading-State)
      mockUseEinsatzDetail.mockReturnValue({ einsatz: undefined });

      // When
      render(<EinsatzCockpit einsatzId={einsatzId} />);

      // Then: Kein Crash, kein LiveIndikator
      expect(screen.queryByTestId('live-indikator')).not.toBeInTheDocument();
      // Grundlegende Elemente sind trotzdem da
      expect(screen.getByTestId('erinnerungen-list')).toBeInTheDocument();
    });
  });
});
