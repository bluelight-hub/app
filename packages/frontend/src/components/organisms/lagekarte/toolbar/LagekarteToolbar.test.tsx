import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { LagekarteToolbar } from './LagekarteToolbar';

describe('LagekarteToolbar', () => {
  it('renders Offline-Download button', () => {
    const mockOnClick = vi.fn();
    render(<LagekarteToolbar onOfflineDownloadClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /offline-karte herunterladen/i });
    expect(button).toBeInTheDocument();
  });

  it('calls onOfflineDownloadClick when button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClick = vi.fn();
    render(<LagekarteToolbar onOfflineDownloadClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /offline-karte herunterladen/i });
    await user.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('has correct ARIA attributes', () => {
    const mockOnClick = vi.fn();
    render(<LagekarteToolbar onOfflineDownloadClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /offline-karte herunterladen/i });
    expect(button).toHaveAttribute('aria-label', 'Offline-Karte herunterladen');
    expect(button).toHaveAttribute('title', 'Karten-Region für Offline-Nutzung herunterladen');
  });

  it('renders download icon', () => {
    const mockOnClick = vi.fn();
    const { container } = render(<LagekarteToolbar onOfflineDownloadClick={mockOnClick} />);

    // PiDownload icon should be rendered (aria-hidden)
    const icon = container.querySelector('[aria-hidden="true"]');
    expect(icon).toBeInTheDocument();
  });

  it('hides text on mobile (responsive)', () => {
    const mockOnClick = vi.fn();
    render(<LagekarteToolbar onOfflineDownloadClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: /offline-karte herunterladen/i });
    const textSpan = button.querySelector('span.hidden.md\\:inline');
    expect(textSpan).toBeInTheDocument();
    expect(textSpan).toHaveTextContent('Offline-Download');
  });
});
