import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ZoneCountBadge } from '../ZoneCountBadge';

describe('ZoneCountBadge', () => {
  it('rendert nicht bei count=0', () => {
    const { container } = render(<ZoneCountBadge count={0} onClick={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('rendert Count und ruft onClick auf', () => {
    const onClick = vi.fn();
    render(<ZoneCountBadge count={3} onClick={onClick} />);
    const btn = screen.getByRole('button');
    expect(btn.textContent).toContain('3');
    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('stoppt Click-Event-Propagation (Parent-Handler wird nicht aufgerufen)', () => {
    const onClick = vi.fn();
    const parentClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <ZoneCountBadge count={2} onClick={onClick} />
      </div>,
    );
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('nutzt default `aria-label` — Singular/Plural', () => {
    const { rerender } = render(<ZoneCountBadge count={1} onClick={() => {}} />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/1 Zone räumlich verortet/);
    rerender(<ZoneCountBadge count={5} onClick={() => {}} />);
    expect(screen.getByRole('button').getAttribute('aria-label')).toMatch(/5 Zonen räumlich verortet/);
  });

  it('übernimmt custom aria-label', () => {
    render(<ZoneCountBadge count={4} onClick={() => {}} aria-label="Custom label" />);
    expect(screen.getByLabelText('Custom label')).toBeInTheDocument();
  });
});
