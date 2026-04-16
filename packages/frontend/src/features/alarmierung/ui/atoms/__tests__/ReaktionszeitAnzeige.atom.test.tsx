import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ReaktionszeitAnzeige } from '../ReaktionszeitAnzeige.atom';

describe('ReaktionszeitAnzeige', () => {
  it('zeigt --:-- und data-stufe="pending" für null', () => {
    const { container } = render(<ReaktionszeitAnzeige sekunden={null} />);
    expect(screen.getByText('--:--')).toBeInTheDocument();
    expect(container.querySelector('[data-stufe="pending"]')).toBeInTheDocument();
  });

  it('klassifiziert 2 Minuten als „schnell" (grün)', () => {
    const { container } = render(<ReaktionszeitAnzeige sekunden={120} />);
    expect(screen.getByText('02:00')).toBeInTheDocument();
    const badge = container.querySelector('[data-stufe="schnell"]');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toMatch(/emerald/);
  });

  it('klassifiziert 7 Minuten als „mittel" (gelb)', () => {
    const { container } = render(<ReaktionszeitAnzeige sekunden={7 * 60} />);
    expect(screen.getByText('07:00')).toBeInTheDocument();
    const badge = container.querySelector('[data-stufe="mittel"]');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toMatch(/amber/);
  });

  it('klassifiziert 12 Minuten als „langsam" (rot)', () => {
    const { container } = render(<ReaktionszeitAnzeige sekunden={12 * 60} />);
    expect(screen.getByText('12:00')).toBeInTheDocument();
    const badge = container.querySelector('[data-stufe="langsam"]');
    expect(badge).toBeInTheDocument();
    expect(badge?.className).toMatch(/red/);
  });

  it('übernimmt ein aria-label für Screenreader', () => {
    render(<ReaktionszeitAnzeige sekunden={300} />);
    const badge = screen.getByLabelText(/Reaktionszeit 5 Minuten 0 Sekunden/);
    expect(badge).toBeInTheDocument();
  });
});
