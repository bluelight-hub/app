import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/features/reminders', () => ({
  PinnwandErinnerungen: ({ einsatzId }: { einsatzId: string }) => (
    <div data-testid="pinnwand-erinnerungen" data-einsatz-id={einsatzId}>
      PinnwandErinnerungen
    </div>
  ),
  useErinnerungenByEinsatz: () => ({ data: [], isLoading: false }),
  ErinnerungUebersicht: () => <div data-testid="erinnerung-uebersicht">ErinnerungUebersicht</div>,
  PersonStatistikTabelle: ({ einsatzId }: { einsatzId: string }) => <div data-testid="person-statistik">{einsatzId}</div>,
  ZeitverlaufDiagramm: ({ einsatzId }: { einsatzId: string }) => <div data-testid="zeitverlauf-diagramm">{einsatzId}</div>,
  EskalationsAnalyse: ({ einsatzId }: { einsatzId: string }) => <div data-testid="eskalations-analyse">{einsatzId}</div>,
  ReaktionszeitStatistik: ({ einsatzId }: { einsatzId: string }) => <div data-testid="reaktionszeit-statistik">{einsatzId}</div>,
  FuehrungsrhythmusStatistik: ({ einsatzId }: { einsatzId: string }) => <div data-testid="fuehrungsrhythmus-statistik">{einsatzId}</div>,
  EinsatzVergleich: ({ einsatzId }: { einsatzId: string }) => <div data-testid="einsatz-vergleich">{einsatzId}</div>,
}));

vi.mock('@/features/notizen', () => ({
  NotizList: ({ einsatzId, mode }: { einsatzId: string; mode?: string }) => (
    <div data-testid="notiz-list" data-einsatz-id={einsatzId} data-mode={mode}>
      NotizList
    </div>
  ),
}));

import { Pinnwand } from '../Pinnwand';

describe('Pinnwand', () => {
  const einsatzId = 'einsatz-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render both Zeitkritisch and Informationen sections', () => {
    render(<Pinnwand einsatzId={einsatzId} />);

    expect(screen.getByLabelText('Zeitkritisch')).toBeInTheDocument();
    expect(screen.getByLabelText('Informationen')).toBeInTheDocument();
  });

  it('should render PinnwandErinnerungen with correct einsatzId', () => {
    render(<Pinnwand einsatzId={einsatzId} />);

    const list = screen.getByTestId('pinnwand-erinnerungen');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-einsatz-id', einsatzId);
  });

  it('should render NotizList with correct einsatzId and sidebar mode', () => {
    render(<Pinnwand einsatzId={einsatzId} />);

    const list = screen.getByTestId('notiz-list');
    expect(list).toBeInTheDocument();
    expect(list).toHaveAttribute('data-einsatz-id', einsatzId);
    expect(list).toHaveAttribute('data-mode', 'sidebar');
  });

  it('should have responsive 70/30 grid layout with lg:grid-cols-10', () => {
    const { container } = render(<Pinnwand einsatzId={einsatzId} />);

    const grid = container.querySelector('.grid.grid-cols-1');
    expect(grid).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-10');
  });

  it('should hide Statistiken by default', () => {
    render(<Pinnwand einsatzId={einsatzId} />);

    expect(screen.queryByTestId('erinnerung-uebersicht')).not.toBeInTheDocument();
    expect(screen.queryByTestId('zeitverlauf-diagramm')).not.toBeInTheDocument();
  });

  it('should show Statistiken when toggle is clicked', async () => {
    const user = userEvent.setup();
    render(<Pinnwand einsatzId={einsatzId} />);

    await user.click(screen.getByText('Statistiken & Analysen'));

    expect(screen.getByTestId('erinnerung-uebersicht')).toBeInTheDocument();
    expect(screen.getByTestId('person-statistik')).toBeInTheDocument();
    expect(screen.getByTestId('zeitverlauf-diagramm')).toBeInTheDocument();
    expect(screen.getByTestId('eskalations-analyse')).toBeInTheDocument();
    expect(screen.getByTestId('reaktionszeit-statistik')).toBeInTheDocument();
    expect(screen.getByTestId('fuehrungsrhythmus-statistik')).toBeInTheDocument();
    expect(screen.getByTestId('einsatz-vergleich')).toBeInTheDocument();
  });

  it('should have accessible aria-labels on sections', () => {
    render(<Pinnwand einsatzId={einsatzId} />);

    expect(screen.getByLabelText('Zeitkritisch')).toBeInTheDocument();
    expect(screen.getByLabelText('Informationen')).toBeInTheDocument();
  });
});
