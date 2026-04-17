import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { WarnstufeChip } from '../WarnstufeChip';
import { WARNSTUFEN, WARNSTUFE_LABELS } from '../../../schemas/gefahrenmatrix.schema';

describe('WarnstufeChip', () => {
  it.each(WARNSTUFEN)('rendert Stufe %s mit Label, Kürzel und Icon (md)', (stufe) => {
    render(<WarnstufeChip warnstufe={stufe} />);
    expect(screen.getByText(WARNSTUFE_LABELS[stufe])).toBeInTheDocument();
    // Kürzel ist über data-warnstufe und Mono-Stil identifizierbar — suchen über Container
    const chip = screen.getByLabelText(`Warnstufe ${WARNSTUFE_LABELS[stufe]}`);
    expect(chip.getAttribute('data-warnstufe')).toBe(stufe);
  });

  it.each(WARNSTUFEN)('rendert compact-Modus (sm) ohne Label mit role=img', (stufe) => {
    render(<WarnstufeChip warnstufe={stufe} size="sm" />);
    const chip = screen.getByRole('img');
    expect(chip.getAttribute('data-warnstufe')).toBe(stufe);
    // Full label darf NICHT im DOM auftauchen wenn showLabel=false (Default für sm)
    expect(chip.textContent).not.toContain(WARNSTUFE_LABELS[stufe]);
  });

  it('respektiert explizites showLabel=true auch bei size=xs', () => {
    render(<WarnstufeChip warnstufe="HOCH" size="xs" showLabel />);
    expect(screen.getByText(WARNSTUFE_LABELS.HOCH)).toBeInTheDocument();
  });

  it('nimmt benutzerdefiniertes aria-label entgegen', () => {
    render(<WarnstufeChip warnstufe="AKUT" aria-label="Akute Gefahr erkannt" />);
    expect(screen.getByLabelText('Akute Gefahr erkannt')).toBeInTheDocument();
  });

  it.each<[string, 'solid' | 'outline' | 'ghost']>([
    ['solid', 'solid'],
    ['outline', 'outline'],
    ['ghost', 'ghost'],
  ])('rendert Variante %s ohne Fehler', (_name, variant) => {
    const { container } = render(<WarnstufeChip warnstufe="MITTEL" variant={variant} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('zeigt unterschiedliche Kürzel je Stufe', () => {
    const { rerender } = render(<WarnstufeChip warnstufe="KEINE" />);
    expect(screen.getByLabelText('Warnstufe Keine').textContent).toContain('—');

    rerender(<WarnstufeChip warnstufe="NIEDRIG" />);
    expect(screen.getByLabelText('Warnstufe Niedrig').textContent).toContain('N');

    rerender(<WarnstufeChip warnstufe="AKUT" />);
    expect(screen.getByLabelText('Warnstufe Akut').textContent).toContain('A');
  });

  it('übernimmt zusätzliche Klassen', () => {
    const { container } = render(<WarnstufeChip warnstufe="NIEDRIG" className="test-class" />);
    expect((container.firstChild as HTMLElement).className).toContain('test-class');
  });

  it('setzt die AKUT-Pulse-Animationsklasse ausschließlich bei Stufe AKUT', () => {
    const { container, rerender } = render(<WarnstufeChip warnstufe="AKUT" />);
    expect((container.firstChild as HTMLElement).className).toContain('animate-warnstufe-akut-pulse');

    for (const stufe of ['KEINE', 'NIEDRIG', 'MITTEL', 'HOCH'] as const) {
      rerender(<WarnstufeChip warnstufe={stufe} />);
      expect((container.firstChild as HTMLElement).className).not.toContain('animate-warnstufe-akut-pulse');
    }
  });

  it('behält die AKUT-Klasse auch bei prefers-reduced-motion (CSS deaktiviert Animation global)', () => {
    const mql: MediaQueryList = {
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn().mockReturnValue(false),
    };
    const matchMediaSpy = vi.spyOn(window, 'matchMedia').mockImplementation(() => mql);

    const { container } = render(<WarnstufeChip warnstufe="AKUT" />);
    // Die Klasse bleibt gesetzt — der Reduced-Motion-Fallback (statischer Doppel-Ring)
    // wird im globalen CSS via @media-Query aktiviert, nicht durch JS-Zweig in der Komponente.
    expect((container.firstChild as HTMLElement).className).toContain('animate-warnstufe-akut-pulse');

    matchMediaSpy.mockRestore();
  });
});
