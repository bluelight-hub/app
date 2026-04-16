import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmpfaengerTypBadge } from '../EmpfaengerTypBadge.atom';

describe('EmpfaengerTypBadge', () => {
  it.each([
    ['fahrzeug', 'Fahrzeug'],
    ['person', 'Person'],
    ['einheit', 'Einheit'],
  ] as const)('rendert Label für kind=%s', (kind, label) => {
    render(<EmpfaengerTypBadge kind={kind} />);
    expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getByRole('status', { name: `Empfänger-Typ: ${label}` })).toBeInTheDocument();
  });

  it('rendert nur Icon bei iconOnly=true', () => {
    render(<EmpfaengerTypBadge kind="fahrzeug" iconOnly />);
    expect(screen.queryByText('Fahrzeug')).not.toBeInTheDocument();
    // Icon bleibt über data-kind auffindbar
    expect(screen.getByRole('status', { name: /Fahrzeug/ })).toBeInTheDocument();
  });

  it('trägt data-kind für Selector-Styles', () => {
    const { container } = render(<EmpfaengerTypBadge kind="person" />);
    expect(container.querySelector('[data-kind="person"]')).toBeInTheDocument();
  });
});
