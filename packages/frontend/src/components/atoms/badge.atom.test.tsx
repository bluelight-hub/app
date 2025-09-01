import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { Badge } from './badge.atom';

describe('Badge', () => {
  it('renders children correctly', () => {
    render(<Badge>Test Badge</Badge>);
    expect(screen.getByText('Test Badge')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-700');
  });

  it('applies success variant classes', () => {
    const { container } = render(<Badge variant="success">Success</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-green-100', 'text-green-800');
  });

  it('applies error variant classes', () => {
    const { container } = render(<Badge variant="error">Error</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-red-100', 'text-red-800');
  });

  it('applies warning variant classes', () => {
    const { container } = render(<Badge variant="warning">Warning</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-yellow-100', 'text-yellow-800');
  });

  it('applies info variant classes', () => {
    const { container } = render(<Badge variant="info">Info</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('applies small size classes', () => {
    const { container } = render(<Badge size="sm">Small</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('px-2', 'py-0.5', 'text-xs');
  });

  it('applies medium size classes', () => {
    const { container } = render(<Badge size="md">Medium</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('px-3', 'py-1.5', 'text-xs');
  });

  it('applies large size classes', () => {
    const { container } = render(<Badge size="lg">Large</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('px-4', 'py-2', 'text-sm');
  });

  it('renders with dot when dot prop is true', () => {
    const { container } = render(<Badge dot>With Dot</Badge>);
    const dot = container.querySelector('.animate-ping');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct dot color', () => {
    const { container } = render(
      <Badge dot dotColor="red">
        Red Dot
      </Badge>,
    );
    const dot = container.querySelector('.bg-red-400');
    expect(dot).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    const badge = container.firstChild;
    expect(badge).toHaveClass('custom-class');
  });
});
