import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PsaBulkActionBar } from '../PsaBulkActionBar';

describe('PsaBulkActionBar (Story 3.2)', () => {
  it('rendert Toolbar-Role mit aria-label und Selection-Count', () => {
    render(<PsaBulkActionBar selectionCount={3} onChange={vi.fn()} onCancel={vi.fn()} />);
    const toolbar = screen.getByRole('toolbar', { name: 'Bulk-Aktionen' });
    expect(toolbar).toBeInTheDocument();
    expect(toolbar.textContent).toContain('3');
    expect(toolbar.textContent).toContain('Abschnitte ausgewählt');
  });

  it('Singular-Form bei N=1', () => {
    render(<PsaBulkActionBar selectionCount={1} onChange={vi.fn()} onCancel={vi.fn()} />);
    const toolbar = screen.getByRole('toolbar', { name: 'Bulk-Aktionen' });
    expect(toolbar.textContent).toContain('1');
    expect(toolbar.textContent).toContain('Abschnitt ausgewählt');
    expect(screen.getByRole('button', { name: /PSA ändern für 1 Abschnitt/ })).toBeInTheDocument();
  });

  it('Primary-Button-Label trägt N und Pluralisierung', () => {
    render(<PsaBulkActionBar selectionCount={4} onChange={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByRole('button', { name: /PSA ändern für 4 Abschnitte/ })).toBeInTheDocument();
  });

  it('Klick auf Primary ruft onChange', () => {
    const onChange = vi.fn();
    render(<PsaBulkActionBar selectionCount={2} onChange={onChange} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByTestId('psa-bulk-change'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('Klick auf Cancel ruft onCancel', () => {
    const onCancel = vi.fn();
    render(<PsaBulkActionBar selectionCount={2} onChange={vi.fn()} onCancel={onCancel} />);
    fireEvent.click(screen.getByTestId('psa-bulk-cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
