import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { Textarea } from '../textarea.atom';

describe('Textarea Atom', () => {
  it('should render correctly with default props', () => {
    render(<Textarea placeholder="Type here" />);
    const textarea = screen.getByPlaceholderText('Type here');
    expect(textarea).toBeInTheDocument();
    expect(textarea.tagName).toBe('TEXTAREA');
    expect(textarea).toHaveClass('border-border-subtle'); // Default variant
    expect(textarea).toHaveClass('px-3'); // Default size (md)
  });

  it('should apply variant classes', () => {
    render(<Textarea variant="error" placeholder="Error Textarea" />);
    const textarea = screen.getByPlaceholderText('Error Textarea');
    expect(textarea).toHaveClass('border-status-danger-border');
  });

  it('should apply size classes', () => {
    render(<Textarea textareaSize="sm" placeholder="Small Textarea" />);
    const textarea = screen.getByPlaceholderText('Small Textarea');
    expect(textarea).toHaveClass('px-3');
  });

  it('should apply fullWidth class', () => {
    render(<Textarea fullWidth placeholder="Full Width Textarea" />);
    const textarea = screen.getByPlaceholderText('Full Width Textarea');
    expect(textarea).toHaveClass('w-full');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLTextAreaElement>();
    render(<Textarea ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLTextAreaElement);
  });

  it('should pass through other props', () => {
    render(<Textarea rows={5} placeholder="Rows" />);
    const textarea = screen.getByPlaceholderText('Rows');
    expect(textarea).toHaveAttribute('rows', '5');
  });
});
