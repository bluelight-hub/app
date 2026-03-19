import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { Badge } from '../badge.atom';
import { Card } from '../card.atom';
import { Text } from '../text.atom';

describe('Badge Atom', () => {
  it('should render correctly with default props', () => {
    render(<Badge>Default Badge</Badge>);
    const badge = screen.getByText('Default Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('rounded-full');
    expect(badge).toHaveClass('px-2.5'); // Default size (md)
  });

  it('should apply variant classes', () => {
    render(<Badge variant="error">Error Badge</Badge>);
    const badge = screen.getByText('Error Badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('rounded-full');
  });

  it('should apply size classes', () => {
    render(<Badge size="lg">Large Badge</Badge>);
    const badge = screen.getByText('Large Badge');
    expect(badge).toHaveClass('px-3');
  });

  it('should render with dot', () => {
    render(
      <Badge dot dotColor="red">
        Dot Badge
      </Badge>,
    );
    const badge = screen.getByText('Dot Badge');
    expect(badge).toBeInTheDocument();
    // The dot structure is a bit complex, just checking if it renders without crashing
    // and maybe checking for the color class on a child would be ideal, but simple rendering check is fine for now.
  });
});

describe('Text Atom', () => {
  it('should render correctly with default props', () => {
    render(<Text>Default Text</Text>);
    const text = screen.getByText('Default Text');
    expect(text.tagName).toBe('P'); // Default as='p'
    expect(text).toHaveClass('text-body-md'); // Default size md
    expect(text).toHaveClass('text-text-primary'); // Default color
  });

  it('should render as different element', () => {
    render(<Text as="span">Span Text</Text>);
    const text = screen.getByText('Span Text');
    expect(text.tagName).toBe('SPAN');
  });

  it('should apply size classes', () => {
    render(<Text size="xl">XL Text</Text>);
    const text = screen.getByText('XL Text');
    expect(text).toHaveClass('text-title-md');
  });

  it('should apply color classes', () => {
    render(<Text color="error">Error Text</Text>);
    const text = screen.getByText('Error Text');
    expect(text).toHaveClass('text-status-danger');
  });
});

describe('Card Atom', () => {
  it('should render correctly with default props', () => {
    render(<Card>Default Card</Card>);
    const card = screen.getByText('Default Card');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('bg-surface-panel');
    expect(card).toHaveClass('rounded-panel');
    expect(card).toHaveClass('p-4'); // Default padding md
  });

  it('should apply padding classes', () => {
    render(<Card padding="none">No Padding Card</Card>);
    const card = screen.getByText('No Padding Card');
    expect(card).not.toHaveClass('p-4');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
