import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Card } from '../card.atom';

describe('Card atom', () => {
  it('rendert Panels mit dem Ring-1-Surface-Vertrag', () => {
    render(<Card>Panel</Card>);

    const card = screen.getByText('Panel');
    expect(card).toHaveClass('rounded-panel');
    expect(card).toHaveClass('bg-surface-panel');
    expect(card).toHaveClass('border-border-subtle');
    expect(card).toHaveClass('shadow-panel');
  });
});
