import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { Input } from '../input.atom';

describe('Input Atom', () => {
  it('should render correctly', () => {
    render(<Input placeholder="Test Input" />);
    const input = screen.getByPlaceholderText('Test Input');
    expect(input).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    render(<Input variant="error" placeholder="Error Input" />);
    const input = screen.getByPlaceholderText('Error Input');
    expect(input).toHaveClass('border-red-300');
  });

  it('should apply size classes', () => {
    render(<Input inputSize="sm" placeholder="Small Input" />);
    const input = screen.getByPlaceholderText('Small Input');
    expect(input).toHaveClass('px-3');
    expect(input).toHaveClass('py-1.5');
    expect(input).toHaveClass('text-sm');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('should render icons correctly', () => {
    const LeftIcon = <span data-testid="left-icon">L</span>;
    const RightElement = <span data-testid="right-element">R</span>;

    render(<Input leftIcon={LeftIcon} rightElement={RightElement} />);

    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-element')).toBeInTheDocument();
  });
});
