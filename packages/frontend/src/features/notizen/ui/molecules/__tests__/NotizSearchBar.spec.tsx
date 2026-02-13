import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NotizSearchBar } from '../NotizSearchBar';

const defaultProps = {
  value: '',
  onChange: vi.fn(),
  onClear: vi.fn(),
};

describe('NotizSearchBar', () => {
  it('sollte das Suchfeld mit Platzhalter "Notizen durchsuchen..." rendern', () => {
    // Gegeben: Default Props
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} />);

    // Dann: Suchfeld mit Platzhalter sichtbar
    expect(screen.getByPlaceholderText('Notizen durchsuchen...')).toBeInTheDocument();
  });

  it('sollte das Lupe-Icon anzeigen', () => {
    // Gegeben: Default Props
    // Wenn: Komponente gerendert wird
    const { container } = render(<NotizSearchBar {...defaultProps} />);

    // Dann: Lupe-Icon ist vorhanden (aria-hidden SVG)
    const svgIcon = container.querySelector('svg[aria-hidden="true"]');
    expect(svgIcon).toBeInTheDocument();
  });

  it('sollte onChange aufrufen bei Texteingabe', async () => {
    // Gegeben: onChange-Mock
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<NotizSearchBar {...defaultProps} onChange={onChange} />);

    // Wenn: Text eingegeben wird
    await user.type(screen.getByPlaceholderText('Notizen durchsuchen...'), 'a');

    // Dann: onChange mit dem eingegebenen Wert aufgerufen
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('sollte den X-Button anzeigen wenn value nicht leer', () => {
    // Gegeben: Value ist gesetzt
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} value="Test" />);

    // Dann: X-Button sichtbar
    expect(screen.getByRole('button', { name: 'Suche zurücksetzen' })).toBeInTheDocument();
  });

  it('sollte den X-Button NICHT anzeigen wenn value leer', () => {
    // Gegeben: Value ist leer
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} value="" />);

    // Dann: Kein X-Button vorhanden
    expect(screen.queryByRole('button', { name: 'Suche zurücksetzen' })).not.toBeInTheDocument();
  });

  it('sollte onClear aufrufen beim Klick auf X-Button', async () => {
    // Gegeben: Value ist gesetzt und onClear-Mock
    const onClear = vi.fn();
    const user = userEvent.setup();
    render(<NotizSearchBar {...defaultProps} value="Test" onClear={onClear} />);

    // Wenn: X-Button geklickt wird
    await user.click(screen.getByRole('button', { name: 'Suche zurücksetzen' }));

    // Dann: onClear aufgerufen
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('sollte den Result-Counter "X von Y" anzeigen wenn resultCount gesetzt und value nicht leer', () => {
    // Gegeben: Value, resultCount und totalCount gesetzt
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} value="Suche" resultCount={3} totalCount={10} />);

    // Dann: Result-Counter "3 von 10" sichtbar
    expect(screen.getByText('3 von 10')).toBeInTheDocument();
  });

  it('sollte den Result-Counter NICHT anzeigen wenn value leer (auch wenn resultCount gesetzt)', () => {
    // Gegeben: Value leer, aber resultCount gesetzt
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} value="" resultCount={3} totalCount={10} />);

    // Dann: Kein Result-Counter vorhanden
    expect(screen.queryByText('3 von 10')).not.toBeInTheDocument();
  });

  it('sollte den Result-Counter "0 von Y" anzeigen wenn keine Treffer', () => {
    // Gegeben: Value gesetzt, resultCount ist 0
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} value="xyz" resultCount={0} totalCount={5} />);

    // Dann: Result-Counter "0 von 5" sichtbar
    expect(screen.getByText('0 von 5')).toBeInTheDocument();
  });

  it('sollte role="status" auf dem Result-Counter haben', () => {
    // Gegeben: Value und resultCount gesetzt
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} value="Suche" resultCount={3} totalCount={10} />);

    // Dann: Counter hat role="status" für Screen Reader
    const counter = screen.getByRole('status');
    expect(counter).toHaveTextContent('3 von 10');
  });

  it('sollte aria-label "Notizen durchsuchen" haben', () => {
    // Gegeben: Default Props
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} />);

    // Dann: Input hat aria-label
    expect(screen.getByRole('textbox', { name: 'Notizen durchsuchen' })).toBeInTheDocument();
  });

  it('sollte das sr-only Label rendern', () => {
    // Gegeben: Default Props
    // Wenn: Komponente gerendert wird
    render(<NotizSearchBar {...defaultProps} />);

    // Dann: sr-only Label mit Text vorhanden
    const label = screen.getByText('Notizen durchsuchen');
    expect(label).toBeInTheDocument();
    expect(label.tagName).toBe('LABEL');
    expect(label).toHaveClass('sr-only');
  });
});
