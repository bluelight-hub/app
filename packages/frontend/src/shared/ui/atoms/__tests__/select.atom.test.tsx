import { render, screen } from '@testing-library/react';
import * as React from 'react';
import { describe, expect, it } from 'vitest';
import { Select } from '../select.atom';

describe('Select Atom', () => {
  const options = [
    { value: '1', label: 'Option 1' },
    { value: '2', label: 'Option 2' },
  ];

  it('should render correctly with default props', () => {
    render(<Select options={options} data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select).toBeInTheDocument();
    expect(select).toHaveClass('border-gray-300'); // Default variant
    expect(select).toHaveClass('px-4'); // Default size (md)
  });

  it('should render options', () => {
    render(<Select options={options} />);
    expect(screen.getByText('Option 1')).toBeInTheDocument();
    expect(screen.getByText('Option 2')).toBeInTheDocument();
  });

  it('should render placeholder', () => {
    render(<Select options={options} placeholder="Choose..." />);
    const placeholder = screen.getByText('Choose...');
    expect(placeholder).toBeInTheDocument();
    expect(placeholder).toBeDisabled();
  });

  it('should apply variant classes', () => {
    render(<Select options={options} variant="error" data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('border-red-300');
  });

  it('should apply size classes', () => {
    render(<Select options={options} selectSize="lg" data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('py-3.5');
  });

  it('should apply fullWidth class', () => {
    render(<Select options={options} fullWidth data-testid="select" />);
    const select = screen.getByTestId('select');
    expect(select).toHaveClass('w-full');
  });

  it('should forward ref', () => {
    const ref = React.createRef<HTMLSelectElement>();
    render(<Select options={options} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLSelectElement);
  });
});
