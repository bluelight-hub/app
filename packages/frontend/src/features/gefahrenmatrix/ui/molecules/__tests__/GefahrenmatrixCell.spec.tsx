import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GefahrenmatrixCell } from '../GefahrenmatrixCell';

function renderCell(props: Partial<React.ComponentProps<typeof GefahrenmatrixCell>> = {}) {
  const defaults = { warnstufe: 'KEINE' as const, onChange: vi.fn() };
  return render(
    <table>
      <tbody>
        <tr>
          <GefahrenmatrixCell {...defaults} {...props} />
        </tr>
      </tbody>
    </table>,
  );
}

describe('GefahrenmatrixCell', () => {
  it('rendert ohne Badge und ohne Orphan-Indicator bei KEINE und count=0', () => {
    renderCell();
    expect(screen.queryByRole('button', { name: /räumlich verortet/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('rendert ZoneCountBadge bei zoneCount>0', () => {
    const onBadge = vi.fn();
    renderCell({ zoneCount: 2, onZoneBadgeClick: onBadge });
    const badge = screen.getByRole('button', { name: /Zonen räumlich verortet/i });
    expect(badge).toBeInTheDocument();
  });

  it('rendert OrphanWarningIndicator bei warnstufe≠KEINE und zoneCount=0', () => {
    renderCell({ warnstufe: 'HOCH' });
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('Badge gewinnt über Orphan-Indicator, wenn beide Bedingungen erfüllt wären', () => {
    renderCell({ warnstufe: 'HOCH', zoneCount: 1 });
    expect(screen.getByRole('button', { name: /Zone räumlich verortet/i })).toBeInTheDocument();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('setzt `data-focus-target` nur bei isFocusTarget=true', () => {
    const { container, rerender } = renderCell({ isFocusTarget: true });
    expect(container.querySelector('[data-focus-target="true"]')).toBeTruthy();
    rerender(
      <table>
        <tbody>
          <tr>
            <GefahrenmatrixCell warnstufe="KEINE" onChange={vi.fn()} isFocusTarget={false} />
          </tr>
        </tbody>
      </table>,
    );
    expect(container.querySelector('[data-focus-target="true"]')).toBeFalsy();
  });
});
