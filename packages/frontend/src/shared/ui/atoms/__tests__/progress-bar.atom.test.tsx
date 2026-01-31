import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProgressBar } from '../progress-bar.atom';

describe('ProgressBar Atom', () => {
  it('should render correctly with default props', () => {
    render(<ProgressBar value={50} />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeInTheDocument();
    expect(progressBar).toHaveClass('h-2'); // Default size md
    expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('should calculate percentage correctly', () => {
    render(<ProgressBar value={30} max={200} showPercentage />);
    const percentageText = screen.getByText('15%');
    expect(percentageText).toBeInTheDocument();
  });

  it('should apply variant classes', () => {
    render(<ProgressBar value={50} variant="success" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('bg-green-100'); // background class for success
    // Note: The inner bar has the foreground color, but testing the container background is simpler for now
  });

  it('should apply size classes', () => {
    render(<ProgressBar value={50} size="lg" />);
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveClass('h-3');
  });

  it('should render label', () => {
    render(<ProgressBar value={50} label="Loading..." />);
    const label = screen.getByText('Loading...');
    expect(label).toBeInTheDocument();
  });

  it('should handle zero max value safely', () => {
    render(<ProgressBar value={50} max={0} showPercentage />);
    // Should fallback to max 100, so 50/100 = 50%
    const percentageText = screen.getByText('50%');
    expect(percentageText).toBeInTheDocument();
  });
});
