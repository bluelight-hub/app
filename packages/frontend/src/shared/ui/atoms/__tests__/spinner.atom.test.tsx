import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { InlineSpinner, Spinner } from '../spinner.atom';

describe('Spinner Atom', () => {
  it('should render with default accessibility attributes', () => {
    render(<Spinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Laden...');
  });

  it('should render with custom label', () => {
    render(<Spinner label="Loading data..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading data...');
  });

  it('should render different types with accessibility attributes', () => {
    const types = ['wave', 'dots', 'ring', 'pulse'] as const;

    types.forEach((type) => {
      const { unmount } = render(<Spinner type={type} label={`Loading ${type}`} />);
      const spinner = screen.getByRole('status');
      expect(spinner).toBeInTheDocument();
      expect(spinner).toHaveAttribute('aria-label', `Loading ${type}`);
      unmount();
    });
  });
});

describe('InlineSpinner', () => {
  it('should render with default accessibility attributes', () => {
    render(<InlineSpinner />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Laden...');
  });

  it('should render with custom label', () => {
    render(<InlineSpinner label="Processing..." />);
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Processing...');
  });
});
