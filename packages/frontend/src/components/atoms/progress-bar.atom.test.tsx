import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { ProgressBar } from './progress-bar.atom';

describe('ProgressBar', () => {
  it('renders with correct value percentage', () => {
    const { container } = render(<ProgressBar value={50} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('calculates percentage correctly with custom max', () => {
    const { container } = render(<ProgressBar value={25} max={50} />);
    const progressBar = container.querySelector('[role="progressbar"]');
    expect(progressBar).toHaveAttribute('aria-valuenow', '25');
    expect(progressBar).toHaveAttribute('aria-valuemax', '50');
  });

  it('clamps value between 0 and 100 percent', () => {
    const { rerender } = render(<ProgressBar value={150} />);
    let progressBar = document.querySelector('[style*="width"]');
    expect(progressBar?.getAttribute('style')).toContain('width: 100%');

    rerender(<ProgressBar value={-10} />);
    progressBar = document.querySelector('[style*="width"]');
    expect(progressBar?.getAttribute('style')).toContain('width: 0%');
  });

  it('displays label when provided', () => {
    render(<ProgressBar value={50} label="Loading..." />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('displays percentage when showPercentage is true', () => {
    render(<ProgressBar value={75} showPercentage />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays both label and percentage', () => {
    render(<ProgressBar value={60} label="Progress" showPercentage />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('60%')).toBeInTheDocument();
  });

  it('applies default variant classes', () => {
    const { container } = render(<ProgressBar value={50} />);
    const bar = container.querySelector('.bg-gray-600');
    expect(bar).toBeInTheDocument();
  });

  it('applies success variant classes', () => {
    const { container } = render(<ProgressBar value={50} variant="success" />);
    const bar = container.querySelector('.bg-green-600');
    expect(bar).toBeInTheDocument();
  });

  it('applies warning variant classes', () => {
    const { container } = render(<ProgressBar value={50} variant="warning" />);
    const bar = container.querySelector('.bg-yellow-600');
    expect(bar).toBeInTheDocument();
  });

  it('applies error variant classes', () => {
    const { container } = render(<ProgressBar value={50} variant="error" />);
    const bar = container.querySelector('.bg-red-600');
    expect(bar).toBeInTheDocument();
  });

  it('applies info variant classes', () => {
    const { container } = render(<ProgressBar value={50} variant="info" />);
    const bar = container.querySelector('.bg-blue-600');
    expect(bar).toBeInTheDocument();
  });

  it('applies small size classes', () => {
    const { container } = render(<ProgressBar value={50} size="sm" />);
    const wrapper = container.querySelector('.h-1');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies medium size classes', () => {
    const { container } = render(<ProgressBar value={50} size="md" />);
    const wrapper = container.querySelector('.h-2');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies large size classes', () => {
    const { container } = render(<ProgressBar value={50} size="lg" />);
    const wrapper = container.querySelector('.h-3');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ProgressBar value={50} className="custom-class" />);
    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('applies animation classes when animated is true', () => {
    const { container } = render(<ProgressBar value={50} animated />);
    const bar = container.querySelector('.animate-pulse');
    expect(bar).toBeInTheDocument();
  });

  it('does not apply animation classes when animated is false', () => {
    const { container } = render(<ProgressBar value={50} animated={false} />);
    const bar = container.querySelector('.animate-pulse');
    expect(bar).not.toBeInTheDocument();
  });
});
