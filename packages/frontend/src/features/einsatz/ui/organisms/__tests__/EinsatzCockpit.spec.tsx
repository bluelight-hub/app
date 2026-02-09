import { render, screen } from '@testing-library/react';

vi.mock('@/features/reminders', () => ({
  ErinnerungenList: ({ einsatzId }: { einsatzId: string }) => (
    <div data-testid="erinnerungen-list" data-einsatz-id={einsatzId}>
      ErinnerungenList
    </div>
  ),
  useErinnerungenByEinsatz: () => ({ data: [], isLoading: false }),
  ErinnerungUebersicht: () => <div data-testid="erinnerung-uebersicht">ErinnerungUebersicht</div>,
  PersonStatistikTabelle: ({ einsatzId }: { einsatzId: string }) => <div data-testid="person-statistik">{einsatzId}</div>,
  ZeitverlaufDiagramm: ({ einsatzId }: { einsatzId: string }) => <div data-testid="zeitverlauf-diagramm">{einsatzId}</div>,
}));

vi.mock('@/features/notizen', () => ({
  NotizList: ({ einsatzId }: { einsatzId: string }) => (
    <div data-testid="notiz-list" data-einsatz-id={einsatzId}>
      NotizList
    </div>
  ),
}));

import { EinsatzCockpit } from '../EinsatzCockpit';

describe('EinsatzCockpit', () => {
  const einsatzId = 'einsatz-123';

  beforeEach(() => {
    vi.clearAllMocks();
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
    const grid = container.querySelector('[aria-label="Einsatz-Cockpit"]');
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

  it('should have accessible aria-labels on sections', () => {
    // Given
    // When
    render(<EinsatzCockpit einsatzId={einsatzId} />);

    // Then
    expect(screen.getByLabelText('Einsatz-Cockpit')).toBeInTheDocument();
    expect(screen.getByLabelText('Zeitkritisch')).toBeInTheDocument();
    expect(screen.getByLabelText('Informationen')).toBeInTheDocument();
  });
});
