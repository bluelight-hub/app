import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { drawStore, resetDrawStore } from '@/features/lagekarte/stores/draw.store';
import { GefahrenzoneDrawControls } from '../GefahrenzoneDrawControls';

describe('GefahrenzoneDrawControls', () => {
  beforeEach(() => {
    resetDrawStore();
  });

  it('rendert Polygon- und Kreis-Button', () => {
    render(<GefahrenzoneDrawControls />);
    expect(screen.getByLabelText(/Polygon zeichnen/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Kreis zeichnen/i)).toBeInTheDocument();
  });

  it('togglet Polygon-Modus über den Button', () => {
    render(<GefahrenzoneDrawControls />);
    const btn = screen.getByLabelText(/Polygon zeichnen/i);

    fireEvent.click(btn);
    expect(drawStore.state.drawContext).toBe('gefahrenzone');
    expect(drawStore.state.drawMode).toBe('draw_polygon');
    expect(btn).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(btn);
    expect(drawStore.state.drawContext).toBeNull();
    expect(drawStore.state.drawMode).toBe('select');
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('wechselt zwischen Polygon und Kreis ohne Zwischenstop', () => {
    render(<GefahrenzoneDrawControls />);
    fireEvent.click(screen.getByLabelText(/Polygon zeichnen/i));
    expect(drawStore.state.drawMode).toBe('draw_polygon');

    fireEvent.click(screen.getByLabelText(/Kreis zeichnen/i));
    expect(drawStore.state.drawMode).toBe('draw_circle');
    expect(drawStore.state.drawContext).toBe('gefahrenzone');
  });

  it('aktiviert Polygon-Modus über den `g`-Shortcut', () => {
    render(<GefahrenzoneDrawControls />);
    fireEvent.keyDown(window, { key: 'g' });
    expect(drawStore.state.drawMode).toBe('draw_polygon');
    expect(drawStore.state.drawContext).toBe('gefahrenzone');
  });

  it('ignoriert `g` wenn ein Input fokussiert ist', () => {
    render(
      <>
        <input data-testid="input" />
        <GefahrenzoneDrawControls />
      </>,
    );
    const input = screen.getByTestId('input');
    input.focus();
    fireEvent.keyDown(input, { key: 'g' });
    expect(drawStore.state.drawMode).toBe('idle');
  });

  it('ist im disabled-Mode nicht interaktiv', () => {
    render(<GefahrenzoneDrawControls disabled />);
    fireEvent.click(screen.getByLabelText(/Polygon zeichnen/i));
    expect(drawStore.state.drawMode).toBe('idle');
  });
});
