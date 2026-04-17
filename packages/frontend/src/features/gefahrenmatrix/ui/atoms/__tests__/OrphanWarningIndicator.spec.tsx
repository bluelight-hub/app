import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OrphanWarningIndicator } from '../OrphanWarningIndicator';

describe('OrphanWarningIndicator', () => {
  it('rendert nicht bei warnstufe=KEINE', () => {
    const { container } = render(<OrphanWarningIndicator warnstufe="KEINE" />);
    expect(container.firstChild).toBeNull();
  });

  it.each(['NIEDRIG', 'MITTEL', 'HOCH', 'AKUT'] as const)('rendert bei Stufe %s mit korrektem aria-label', (stufe) => {
    render(<OrphanWarningIndicator warnstufe={stufe} />);
    const el = screen.getByRole('img');
    const label = el.getAttribute('aria-label') ?? '';
    expect(label).toContain('ohne räumliche Verortung');
    expect(label.toLowerCase()).toContain(stufe.toLowerCase());
  });
});
