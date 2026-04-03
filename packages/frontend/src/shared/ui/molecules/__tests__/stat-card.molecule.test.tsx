import { render, screen } from '@testing-library/react';
import { PiUsers } from 'react-icons/pi';
import { describe, expect, it } from 'vitest';
import { StatCard } from '../stat-card.molecule';

describe('StatCard', () => {
  it('rendert Label und Zahlenwert', () => {
    render(<StatCard label="Benutzer" value={42} />);
    expect(screen.getByText('Benutzer')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('rendert String-Wert', () => {
    render(<StatCard label="Status" value="Aktiv" />);
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
  });

  it('rendert Icon', () => {
    render(<StatCard label="Benutzer" value={10} icon={PiUsers} />);
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('rendert Beschreibung', () => {
    render(<StatCard label="Benutzer" value={10} description="Aktive Benutzer im System" />);
    expect(screen.getByText('Aktive Benutzer im System')).toBeInTheDocument();
  });

  it('rendert ohne optionale Props', () => {
    render(<StatCard label="Test" value={0} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(document.querySelector('svg')).not.toBeInTheDocument();
  });
});
