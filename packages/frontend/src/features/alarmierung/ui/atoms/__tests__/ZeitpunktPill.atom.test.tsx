import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ZeitpunktPill } from '../ZeitpunktPill.atom';

describe('ZeitpunktPill', () => {
  it('zeigt --:-- und data-quelle="leer" bei fehlendem Wert', () => {
    const { container } = render(<ZeitpunktPill wert={null} label="Ausgerückt" />);
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(container.querySelector('[data-quelle="leer"]')).toBeInTheDocument();
  });

  it('markiert explizite FMS-Quelle via data-quelle="fms"', () => {
    const { container } = render(<ZeitpunktPill wert="2026-04-15T08:15:00.000Z" quelle="fms" label="Ausgerückt" />);
    expect(container.querySelector('[data-quelle="fms"]')).toBeInTheDocument();
  });

  it('nimmt „manuell" als Default-Quelle an, wenn ein Wert gesetzt ist', () => {
    const { container } = render(<ZeitpunktPill wert="2026-04-15T08:15:00.000Z" label="Ausgerückt" />);
    expect(container.querySelector('[data-quelle="manuell"]')).toBeInTheDocument();
  });

  it('formatiert den Zeitpunkt als HH:mm', () => {
    // 08:15 UTC → lokaler Offset ist testumgebungsabhängig; daher prüfen wir
    // nur das Format HH:mm.
    const { container } = render(<ZeitpunktPill wert="2026-04-15T08:15:00.000Z" />);
    const text = container.textContent ?? '';
    expect(text).toMatch(/\d{2}:\d{2}/);
  });

  it('spiegelt Label in aria-label', () => {
    render(<ZeitpunktPill wert={null} label="Ausgerückt" />);
    const badge = screen.getByLabelText(/Ausgerückt --:-- \(nicht gesetzt\)/);
    expect(badge).toBeInTheDocument();
  });
});
