import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { CommandTrigger } from '../command-trigger.atom';

describe('CommandTrigger Atom', () => {
  it('should render correctly with default label', () => {
    const handleClick = vi.fn();
    render(<CommandTrigger onClick={handleClick} />);

    // The default aria-label is "Befehle und Navigation"
    // The visible text is "Befehle & Navigation"
    // By querying for "Befehle und Navigation", we confirm aria-label is taking precedence
    const button = screen.getByRole('button', { name: 'Befehle und Navigation' });
    expect(button).toBeInTheDocument();

    fireEvent.click(button);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should use custom aria-label', () => {
    const handleClick = vi.fn();
    render(<CommandTrigger onClick={handleClick} aria-label="Suche öffnen" />);

    const button = screen.getByRole('button', { name: 'Suche öffnen' });
    expect(button).toBeInTheDocument();
  });
});
