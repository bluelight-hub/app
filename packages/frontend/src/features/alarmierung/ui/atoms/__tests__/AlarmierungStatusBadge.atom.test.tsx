import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { AlarmierungStatusBadge } from '../AlarmierungStatusBadge.atom';

describe('AlarmierungStatusBadge', () => {
  it('rendert „Aktiv" für status=aktiv', () => {
    render(<AlarmierungStatusBadge status="aktiv" />);
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Alarmierungs-Status: Aktiv' })).toBeInTheDocument();
  });

  it('rendert „Abgeschlossen" für status=abgeschlossen', () => {
    render(<AlarmierungStatusBadge status="abgeschlossen" />);
    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
    expect(screen.getByRole('status', { name: 'Alarmierungs-Status: Abgeschlossen' })).toBeInTheDocument();
  });

  it('trägt data-status für Selector-Styles', () => {
    const { container } = render(<AlarmierungStatusBadge status="aktiv" />);
    expect(container.querySelector('[data-status="aktiv"]')).toBeInTheDocument();
  });

  it('verwendet kleine Klasse bei size="sm"', () => {
    const { container } = render(<AlarmierungStatusBadge status="aktiv" size="sm" />);
    const span = container.querySelector('[data-status="aktiv"]');
    expect(span?.className).toContain('text-[11px]');
  });
});
