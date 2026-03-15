import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Heading } from '../heading.atom';
import { Label } from '../label.atom';
import { Text } from '../text.atom';

describe('Typography Atoms', () => {
  it('maps headings to the Ring-1 title scale', () => {
    render(<Heading size="lg">Leitstelle</Heading>);

    const heading = screen.getByRole('heading', { name: 'Leitstelle' });
    expect(heading).toHaveClass('text-title-md');
    expect(heading).toHaveClass('text-text-primary');
  });

  it('maps text variants to semantic foreground tokens', () => {
    render(<Text color="muted">Hinweis</Text>);

    const text = screen.getByText('Hinweis');
    expect(text).toHaveClass('text-body-md');
    expect(text).toHaveClass('text-text-muted');
  });

  it('renders labels with shared density and required state tokens', () => {
    render(
      <Label required htmlFor="einsatz-name">
        Einsatzname
      </Label>,
    );

    const label = screen.getByText('Einsatzname');
    expect(label).toHaveClass('text-body-sm');
    expect(label).toHaveClass('text-text-secondary');
    expect(screen.getByText('*')).toHaveClass('text-status-danger');
  });
});
