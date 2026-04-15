import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FunkPrioritaetBadge } from '../FunkPrioritaetBadge.atom';

describe('FunkPrioritaetBadge', () => {
  it('rendert das Label "Routine" für routine', () => {
    render(<FunkPrioritaetBadge prioritaet="routine" />);
    expect(screen.getByText('Routine')).toBeInTheDocument();
  });

  it('rendert das Label "Priorität" für prioritaet', () => {
    render(<FunkPrioritaetBadge prioritaet="prioritaet" />);
    expect(screen.getByText('Priorität')).toBeInTheDocument();
  });

  it('pulsiert bei Notfall und rendert Sirenen-Label', () => {
    const { container } = render(<FunkPrioritaetBadge prioritaet="notfall" />);
    expect(screen.getByText('Notfall')).toBeInTheDocument();
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('liefert eine Screenreader-geeignete Beschreibung', () => {
    render(<FunkPrioritaetBadge prioritaet="notfall" />);
    expect(screen.getByRole('status', { name: /Funkpriorität: Notfall/ })).toBeInTheDocument();
  });

  it('unterstützt iconOnly-Modus ohne sichtbares Label', () => {
    render(<FunkPrioritaetBadge prioritaet="routine" iconOnly />);
    expect(screen.queryByText('Routine')).not.toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Funkpriorität: Routine/ })).toBeInTheDocument();
  });
});
