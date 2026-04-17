import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ModuleOverviewButton } from '../module-overview-button.atom';

describe('ModuleOverviewButton Atom', () => {
  it('rendert mit Default-aria-label und Focus-Ring-Klasse', () => {
    render(<ModuleOverviewButton onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Modulübersicht öffnen' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute('title', 'Modulübersicht öffnen');
    expect(button.className).toContain('focus-visible:shadow-focus-ring');
    expect(button.className).toContain('h-10');
    expect(button.className).toContain('w-10');
  });

  it('akzeptiert ein eigenes aria-label', () => {
    render(<ModuleOverviewButton onClick={vi.fn()} aria-label="Alle Module anzeigen" />);

    expect(screen.getByRole('button', { name: 'Alle Module anzeigen' })).toBeInTheDocument();
  });

  it('ruft onClick bei Maus-Klick auf', () => {
    const handleClick = vi.fn();
    render(<ModuleOverviewButton onClick={handleClick} />);

    fireEvent.click(screen.getByRole('button', { name: 'Modulübersicht öffnen' }));

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ist per Enter-Taste aktivierbar', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ModuleOverviewButton onClick={handleClick} />);

    const button = screen.getByRole('button', { name: 'Modulübersicht öffnen' });
    button.focus();
    await user.keyboard('{Enter}');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ist per Leertaste aktivierbar', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ModuleOverviewButton onClick={handleClick} />);

    const button = screen.getByRole('button', { name: 'Modulübersicht öffnen' });
    button.focus();
    await user.keyboard('[Space]');

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('ist tabbierbar und kann den Fokus erhalten', () => {
    render(<ModuleOverviewButton onClick={vi.fn()} />);

    const button = screen.getByRole('button', { name: 'Modulübersicht öffnen' });
    button.focus();

    expect(button).toHaveFocus();
    expect(button.tabIndex).toBe(0);
  });
});
