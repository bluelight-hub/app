import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FunkKontextBadge } from '../FunkKontextBadge.molecule';

describe('FunkKontextBadge', () => {
  it('zeigt Kanalname + Prioritäts-Icon', () => {
    render(<FunkKontextBadge kanal={{ id: 'k1', name: 'Führung 1' }} prioritaet="routine" />);
    expect(screen.getByText('Führung 1')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: /Funkpriorität: Routine/ })).toBeInTheDocument();
  });

  it('fällt auf "Kanal (gelöscht)" zurück, wenn kein Kanal aufgelöst werden kann', () => {
    render(<FunkKontextBadge prioritaet="notfall" />);
    expect(screen.getByText(/gelöscht/i)).toBeInTheDocument();
  });

  it('ruft onClick bei Button-Modus', () => {
    const handleClick = vi.fn();
    render(<FunkKontextBadge kanal={{ id: 'k1', name: 'Führung 1' }} prioritaet="routine" onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });

  it('rendert als Span im asSpan-Modus (kein Button)', () => {
    render(<FunkKontextBadge kanal={{ id: 'k1', name: 'Führung 1' }} prioritaet="routine" asSpan />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
