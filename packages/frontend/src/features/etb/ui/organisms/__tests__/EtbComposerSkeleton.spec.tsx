import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EtbComposerSkeleton } from '../EtbComposerSkeleton';

describe('EtbComposerSkeleton', () => {
  it('rendert den Skeleton-Container mit role="status"', () => {
    render(<EtbComposerSkeleton />);
    const skeleton = screen.getByRole('status');
    expect(skeleton).toBeInTheDocument();
    expect(skeleton).toHaveAttribute('aria-label', 'ETB Composer wird geladen');
  });

  it('zeigt den Aktions-Hint "ETB wird geladen — bitte warten"', () => {
    render(<EtbComposerSkeleton />);
    expect(screen.getByText('ETB wird geladen — bitte warten')).toBeInTheDocument();
  });

  it('rendert Skeleton-Platzhalter für Header, Formular und Liste', () => {
    const { container } = render(<EtbComposerSkeleton />);
    const pulseElements = container.querySelectorAll('.animate-pulse');
    // Header (3) + Formular (multiple) + Liste (16) = viele Skeleton-Elemente
    expect(pulseElements.length).toBeGreaterThanOrEqual(20);
  });
});
