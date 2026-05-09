import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Kbd, formatShortcutKey } from '../kbd.atom';

describe('Kbd atom', () => {
  it('rendert ein semantisches kbd-Element mit Ring-1-Tokenklassen', () => {
    render(<Kbd keys="mod+k" platform="apple" />);

    const kbd = screen.getByText('⌘').closest('kbd');
    expect(kbd).toBeInTheDocument();
    expect(kbd).toHaveClass('font-mono');
    expect(kbd).toHaveClass('border-border-strong');
    expect(kbd).toHaveTextContent('⌘K');
  });

  it('normalisiert mod/cmd plattformabhängig', () => {
    expect(formatShortcutKey('mod', 'apple')).toBe('⌘');
    expect(formatShortcutKey('cmd', 'nonApple')).toBe('Ctrl');
  });

  it('normalisiert Modifier, Einzelkeys, Pfeiltasten, Slash, Escape und Space stabil', () => {
    const keys = ['shift', 'alt', 'enter', 'escape', 'space', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', '/'];

    expect(keys.map((key) => formatShortcutKey(key, 'apple'))).toEqual(['⇧', '⌥', 'Enter', 'Esc', 'Space', '↑', '↓', '←', '→', '/']);
  });

  it('unterstützt Array-Keys ohne String-Splitting', () => {
    render(<Kbd keys={['Ctrl', 'Shift', 'E']} platform="nonApple" />);

    expect(screen.getByText('Ctrl').closest('kbd')).toHaveTextContent('Ctrl⇧E');
  });

  it('stellt Fragezeichen als eigenständiges Shortcut-Ziel dar', () => {
    render(<Kbd keys="?" platform="nonApple" />);

    expect(screen.getByText('?').closest('kbd')).toHaveTextContent('?');
  });
});
