import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GefahrenzoneInlinePopover, type GefahrenzonePopoverValues } from '../GefahrenzoneInlinePopover';

const defaults: GefahrenzonePopoverValues = {
  gefahrentyp: 'BRAND',
  schutzobjekt: 'MENSCHEN',
  warnstufe: 'HOCH',
};

describe('GefahrenzoneInlinePopover', () => {
  it('rendert im Create-Mode den Gefahrentyp-Picker und Schutzobjekt-Select', () => {
    const onSubmit = vi.fn();
    render(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={onSubmit} onCancel={() => {}} />);
    expect(screen.getByRole('heading', { name: /Neue Gefahrenzone/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Gefahrentyp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Schutzobjekt/i)).toBeInTheDocument();
  });

  it('rendert im Edit-Mode den Gefahrentyp read-only und kein Schutzobjekt-Select', () => {
    render(<GefahrenzoneInlinePopover mode="edit" initialValues={defaults} onSubmit={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole('heading', { name: /Zone bearbeiten/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Schutzobjekt/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Brand/i)).toBeInTheDocument();
  });

  it('zeigt alle fünf Warnstufen als Radio-Buttons und markiert den Default', () => {
    render(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={() => {}} onCancel={() => {}} />);
    const group = screen.getByRole('radiogroup', { name: /Warnstufe/i });
    const radios = group.querySelectorAll('[role="radio"]');
    expect(radios).toHaveLength(5);
    expect(screen.getByRole('radio', { name: /Hoch/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('wechselt die Warnstufe per Klick', () => {
    render(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={() => {}} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: /Akut/i }));
    expect(screen.getByRole('radio', { name: /Akut/i })).toHaveAttribute('aria-checked', 'true');
  });

  it('ruft onSubmit mit den aktuellen Werten bei Submit auf', async () => {
    const onSubmit = vi.fn();
    render(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={onSubmit} onCancel={() => {}} />);
    fireEvent.click(screen.getByRole('radio', { name: /Akut/i }));
    fireEvent.click(screen.getByRole('button', { name: /Zone anlegen/i }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ warnstufe: 'AKUT', gefahrentyp: 'BRAND', schutzobjekt: 'MENSCHEN' });
  });

  it('ruft onCancel beim X-Button-Klick auf', () => {
    const onCancel = vi.fn();
    render(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={() => {}} onCancel={onCancel} />);
    fireEvent.click(screen.getByLabelText(/Popover schließen/i));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('ruft onCancel bei Esc-Taste auf', () => {
    const onCancel = vi.fn();
    render(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={() => {}} onCancel={onCancel} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('zeigt den Löschen-Button nur im Edit-Mode mit onDelete', () => {
    const onDelete = vi.fn();
    const { rerender } = render(<GefahrenzoneInlinePopover mode="edit" initialValues={defaults} onSubmit={() => {}} onCancel={() => {}} onDelete={onDelete} />);
    fireEvent.click(screen.getByLabelText(/Zone löschen/i));
    expect(onDelete).toHaveBeenCalledOnce();

    rerender(<GefahrenzoneInlinePopover mode="create" initialValues={defaults} onSubmit={() => {}} onCancel={() => {}} onDelete={onDelete} />);
    expect(screen.queryByLabelText(/Zone löschen/i)).not.toBeInTheDocument();
  });
});
