import { render, screen } from '@testing-library/react';
import { EntityStatusBadge } from '../EntityStatusBadge.molecule';

describe('EntityStatusBadge', () => {
  it('sollte aktiv-Status mit Icon und Label anzeigen', () => {
    render(<EntityStatusBadge status="aktiv" />);
    const badge = screen.getByText('Aktiv');
    expect(badge).toBeInTheDocument();
    expect(screen.getByLabelText('Aktiv')).toBeInTheDocument();
  });

  it('sollte gesperrt-Status mit Grund als sr-only Text anzeigen', () => {
    render(<EntityStatusBadge status="gesperrt" reason="Verdaechtige Aktivitaeten" />);
    expect(screen.getByText('Gesperrt')).toBeInTheDocument();
    expect(screen.getByText(': Verdaechtige Aktivitaeten')).toHaveClass('sr-only');
  });

  it('sollte archiviert-Status rendern', () => {
    render(<EntityStatusBadge status="archiviert" />);
    expect(screen.getByText('Archiviert')).toBeInTheDocument();
  });

  it('sollte inaktiv-Status rendern', () => {
    render(<EntityStatusBadge status="inaktiv" />);
    expect(screen.getByText('Inaktiv')).toBeInTheDocument();
  });

  it('sollte title mit Grund setzen wenn vorhanden', () => {
    render(<EntityStatusBadge status="gesperrt" reason="Test-Grund" />);
    const badge = screen.getByText('Gesperrt').closest('span');
    expect(badge).toHaveAttribute('title', 'Test-Grund');
  });

  it('sollte kein title ohne Grund setzen', () => {
    render(<EntityStatusBadge status="aktiv" />);
    const badge = screen.getByText('Aktiv').closest('span');
    expect(badge).not.toHaveAttribute('title');
  });

  describe('aria-label', () => {
    it.each([
      { status: 'aktiv' as const, expectedLabel: 'Aktiv' },
      { status: 'gesperrt' as const, expectedLabel: 'Gesperrt' },
      { status: 'archiviert' as const, expectedLabel: 'Archiviert' },
      { status: 'inaktiv' as const, expectedLabel: 'Inaktiv' },
    ])('sollte aria-label "$expectedLabel" fuer Status "$status" setzen', ({ status, expectedLabel }) => {
      render(<EntityStatusBadge status={status} />);
      const badge = screen.getByLabelText(expectedLabel);
      expect(badge).toBeInTheDocument();
    });

    it('sollte aria-label mit Grund erweitern wenn reason angegeben', () => {
      render(<EntityStatusBadge status="gesperrt" reason="Verdaechtige Aktivitaeten" />);
      const badge = screen.getByLabelText('Gesperrt: Verdaechtige Aktivitaeten');
      expect(badge).toBeInTheDocument();
    });

    it('sollte aria-label ohne Grund-Suffix setzen wenn reason null', () => {
      render(<EntityStatusBadge status="aktiv" reason={null} />);
      const badge = screen.getByLabelText('Aktiv');
      expect(badge).toBeInTheDocument();
    });
  });
});
