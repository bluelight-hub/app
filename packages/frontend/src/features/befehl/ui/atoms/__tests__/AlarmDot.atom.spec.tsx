import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlarmDot } from '../AlarmDot.atom';

describe('AlarmDot', () => {
  it('rendert ohne Fehler', () => {
    const { container } = render(<AlarmDot />);
    expect(container.firstChild).toBeTruthy();
  });

  it('hat aria-hidden="true" (dekorativ)', () => {
    const { container } = render(<AlarmDot />);
    expect(container.querySelector('[aria-hidden="true"]')).toBeTruthy();
  });

  it('hat animate-ping Klasse fuer Puls-Animation', () => {
    const { container } = render(<AlarmDot />);
    const pingSpan = container.querySelector('.animate-ping');
    expect(pingSpan).toBeTruthy();
  });

  it('hat motion-reduce:animate-none fuer Barrierefreiheit', () => {
    const { container } = render(<AlarmDot />);
    const pingSpan = container.querySelector('.animate-ping');
    expect(pingSpan?.className).toContain('motion-reduce:animate-none');
  });

  it('hat bg-red-500 Farbe', () => {
    const { container } = render(<AlarmDot />);
    const redDots = container.querySelectorAll('.bg-red-500');
    expect(redDots.length).toBe(2); // Ping + statischer Dot
  });

  it('akzeptiert className Prop', () => {
    const { container } = render(<AlarmDot className="ml-2" />);
    expect(container.firstChild).toHaveClass('ml-2');
  });
});
