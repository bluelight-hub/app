import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NachalarmierungBadge } from '../NachalarmierungBadge.atom';

describe('NachalarmierungBadge', () => {
  it('rendert als <span role="status"> ohne onClick-Handler', () => {
    render(<NachalarmierungBadge />);
    const badge = screen.getByRole('status', { name: 'Nachalarmierung' });
    expect(badge).toBeInTheDocument();
    expect(badge.tagName).toBe('SPAN');
  });

  it('rendert als <button> wenn onClick gesetzt ist und ruft den Handler beim Klick auf', () => {
    const onClick = vi.fn();
    render(<NachalarmierungBadge onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Nachalarmierung' });
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('nimmt die Ursprungsbezeichnung in das aria-label auf', () => {
    render(<NachalarmierungBadge ursprungBezeichnung="BMA Müllerstraße 12" />);
    expect(screen.getByRole('status', { name: 'Nachalarmierung von „BMA Müllerstraße 12"' })).toBeInTheDocument();
  });
});
