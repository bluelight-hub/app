import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AmpelDashboardViewToggle } from '../AmpelDashboardViewToggle';

describe('AmpelDashboardViewToggle', () => {
  it('markiert den Überblick als aktive Ansicht', () => {
    render(<AmpelDashboardViewToggle effectiveView="cards" storedView="cards" focusAvailable={true} onViewChange={vi.fn()} />);

    expect(screen.getByRole('button', { name: 'Überblick' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Fokus' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('schaltet per Klick auf Fokus ohne Navigation um', async () => {
    const onViewChange = vi.fn();
    const user = userEvent.setup();
    render(<AmpelDashboardViewToggle effectiveView="cards" storedView="cards" focusAvailable={true} onViewChange={onViewChange} />);

    await user.click(screen.getByRole('button', { name: 'Fokus' }));

    expect(onViewChange).toHaveBeenCalledWith('focus');
  });

  it('deaktiviert Fokus unterhalb des Breakpoints mit Tooltip-Hinweis', async () => {
    const onViewChange = vi.fn();
    const user = userEvent.setup();
    render(<AmpelDashboardViewToggle effectiveView="cards" storedView="focus" focusAvailable={false} onViewChange={onViewChange} />);

    const focusButton = screen.getByRole('button', { name: 'Fokus' });
    const tooltip = screen.getByRole('tooltip');
    expect(focusButton).toHaveAttribute('aria-disabled', 'true');
    expect(focusButton).toHaveAttribute('aria-describedby', tooltip.id);
    expect(tooltip).toHaveTextContent('Fokus-Ansicht benötigt ≥ 1024 px');

    await user.click(focusButton);
    expect(onViewChange).not.toHaveBeenCalled();
  });

  it('macht den Breakpoint-Hinweis per Tastatur erreichbar', async () => {
    const user = userEvent.setup();
    render(<AmpelDashboardViewToggle effectiveView="cards" storedView="focus" focusAvailable={false} onViewChange={vi.fn()} />);

    await user.tab();
    await user.tab();

    const focusButton = screen.getByRole('button', { name: 'Fokus' });
    expect(focusButton).toHaveFocus();
    expect(focusButton).toHaveAccessibleDescription('Fokus-Ansicht benötigt ≥ 1024 px');
  });
});
