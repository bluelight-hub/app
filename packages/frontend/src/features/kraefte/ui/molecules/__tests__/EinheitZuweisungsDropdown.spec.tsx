import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { EinheitZuweisungsDropdown } from '../EinheitZuweisungsDropdown';

const mockEinheiten = [
  { id: 'e1', name: '1. Löschgruppe', typ: 'GRUPPE' },
  { id: 'e2', name: 'Abschnitt Nord', typ: 'ABSCHNITT' },
];

describe('EinheitZuweisungsDropdown', () => {
  it('zeigt "Zuweisen" wenn keine Einheit zugewiesen ist', () => {
    render(<EinheitZuweisungsDropdown currentEinheitId={null} einheiten={mockEinheiten} onAssign={vi.fn()} />);

    expect(screen.getByText('Zuweisen')).toBeInTheDocument();
  });

  it('zeigt den Einheit-Namen wenn eine Einheit zugewiesen ist', () => {
    render(<EinheitZuweisungsDropdown currentEinheitId="e1" einheiten={mockEinheiten} onAssign={vi.fn()} />);

    expect(screen.getByText('1. Löschgruppe')).toBeInTheDocument();
  });

  it('zeigt "..." wenn isLoading aktiv ist', () => {
    render(<EinheitZuweisungsDropdown currentEinheitId="e1" einheiten={mockEinheiten} onAssign={vi.fn()} isLoading={true} />);

    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
