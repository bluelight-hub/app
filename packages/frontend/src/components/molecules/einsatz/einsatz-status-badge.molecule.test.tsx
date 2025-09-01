import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import '@testing-library/jest-dom';
import { EinsatzStatusBadge, EinsatzStatus } from './einsatz-status-badge.molecule';

describe('EinsatzStatusBadge', () => {
  it('renders ANGELEGT status with correct styling', () => {
    render(<EinsatzStatusBadge status={EinsatzStatus.ANGELEGT} />);
    expect(screen.getByText('Angelegt')).toBeInTheDocument();
    const badge = screen.getByText('Angelegt').parentElement;
    expect(badge).toHaveClass('bg-blue-100');
  });

  it('renders IN_BEARBEITUNG status with correct styling', () => {
    render(<EinsatzStatusBadge status={EinsatzStatus.IN_BEARBEITUNG} />);
    expect(screen.getByText('In Bearbeitung')).toBeInTheDocument();
    const badge = screen.getByText('In Bearbeitung').parentElement;
    expect(badge).toHaveClass('bg-yellow-100');
  });

  it('renders ABGESCHLOSSEN status with correct styling', () => {
    render(<EinsatzStatusBadge status={EinsatzStatus.ABGESCHLOSSEN} />);
    expect(screen.getByText('Abgeschlossen')).toBeInTheDocument();
    const badge = screen.getByText('Abgeschlossen').parentElement;
    expect(badge).toHaveClass('bg-green-100');
  });

  it('renders ARCHIVIERT status with correct styling', () => {
    render(<EinsatzStatusBadge status={EinsatzStatus.ARCHIVIERT} />);
    expect(screen.getByText('Archiviert')).toBeInTheDocument();
    const badge = screen.getByText('Archiviert').parentElement;
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('handles unknown status gracefully', () => {
    render(<EinsatzStatusBadge status="UNKNOWN_STATUS" />);
    expect(screen.getByText('UNKNOWN_STATUS')).toBeInTheDocument();
    const badge = screen.getByText('UNKNOWN_STATUS').parentElement;
    expect(badge).toHaveClass('bg-gray-100');
  });

  it('applies size prop correctly', () => {
    const { rerender } = render(<EinsatzStatusBadge status={EinsatzStatus.ANGELEGT} size="sm" />);
    let badge = screen.getByText('Angelegt').parentElement;
    expect(badge).toHaveClass('px-2', 'py-0.5');

    rerender(<EinsatzStatusBadge status={EinsatzStatus.ANGELEGT} size="md" />);
    badge = screen.getByText('Angelegt').parentElement;
    expect(badge).toHaveClass('px-3', 'py-1.5');

    rerender(<EinsatzStatusBadge status={EinsatzStatus.ANGELEGT} size="lg" />);
    badge = screen.getByText('Angelegt').parentElement;
    expect(badge).toHaveClass('px-4', 'py-2');
  });

  it('shows dot when showDot is true', () => {
    const { container } = render(<EinsatzStatusBadge status={EinsatzStatus.IN_BEARBEITUNG} showDot />);
    const dot = container.querySelector('.animate-ping');
    expect(dot).toBeInTheDocument();
  });

  it('applies correct dot color for each status', () => {
    const { container, rerender } = render(<EinsatzStatusBadge status={EinsatzStatus.ANGELEGT} showDot />);
    let dot = container.querySelector('.bg-blue-400');
    expect(dot).toBeInTheDocument();

    rerender(<EinsatzStatusBadge status={EinsatzStatus.IN_BEARBEITUNG} showDot />);
    dot = container.querySelector('.bg-yellow-400');
    expect(dot).toBeInTheDocument();

    rerender(<EinsatzStatusBadge status={EinsatzStatus.ABGESCHLOSSEN} showDot />);
    dot = container.querySelector('.bg-green-400');
    expect(dot).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<EinsatzStatusBadge status={EinsatzStatus.ANGELEGT} className="custom-class" />);
    const badge = container.querySelector('.custom-class');
    expect(badge).toBeInTheDocument();
  });
});
