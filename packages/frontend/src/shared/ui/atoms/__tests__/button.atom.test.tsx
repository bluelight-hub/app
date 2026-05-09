import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../button.atom';

describe('Button atom', () => {
  it('verwendet fuer die Primaeraktion den Ring-1-Token-Vertrag', () => {
    render(<Button>Speichern</Button>);

    const button = screen.getByRole('button', { name: 'Speichern' });
    expect(button).toHaveClass('rounded-control');
    expect(button).toHaveClass('bg-action-primary');
    expect(button).toHaveClass('text-text-inverse');
    expect(button).toHaveClass('shadow-button-primary');
    expect(button).toHaveClass('focus-visible:shadow-focus-ring');
  });

  it('behält bei großen Primärbuttons die helle Schrift trotz Typografie-Skalierung', () => {
    render(<Button size="lg">Anmelden</Button>);

    const button = screen.getByRole('button', { name: 'Anmelden' });
    expect(button).toHaveClass('bg-action-primary');
    expect(button).toHaveClass('text-text-inverse');
    expect(button.firstElementChild).toHaveClass('text-body-md');
  });

  it('rendert sekundäre Outline-Aktionen mit Surface- und Border-Tokens', () => {
    render(
      <Button appearance="outline" intent="secondary">
        Abbrechen
      </Button>,
    );

    const button = screen.getByRole('button', { name: 'Abbrechen' });
    expect(button).toHaveClass('bg-surface-panel');
    expect(button).toHaveClass('border-border-subtle');
    expect(button).toHaveClass('text-text-primary');
  });

  it('rendert Shortcut-Badges auf gefuellten Aktionen ohne harte Weisswerte', () => {
    render(<Button kbd="cmd+k">Palette</Button>);

    const shortcut = screen.getByText('Ctrl').closest('kbd');
    expect(shortcut).not.toBeNull();
    expect(shortcut).toHaveClass('bg-surface-inverse/16');
    expect(shortcut).toHaveClass('text-text-inverse');
    expect(shortcut).toHaveClass('group-hover:bg-surface-inverse/24');
    expect(shortcut).not.toHaveClass('group-hover:bg-action-secondary-hover');
  });
});
