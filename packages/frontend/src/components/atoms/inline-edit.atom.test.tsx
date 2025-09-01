import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import { InlineEdit } from './inline-edit.atom';

describe('InlineEdit', () => {
  it('displays initial value', () => {
    render(<InlineEdit value="Initial text" onSave={vi.fn()} />);
    expect(screen.getByText('Initial text')).toBeInTheDocument();
  });

  it('displays placeholder when value is empty', () => {
    render(<InlineEdit value="" onSave={vi.fn()} placeholder="Enter text" />);
    expect(screen.getByText('Enter text')).toBeInTheDocument();
  });

  it('enters edit mode on click', async () => {
    const user = userEvent.setup();
    render(<InlineEdit value="Click me" onSave={vi.fn()} />);

    await user.click(screen.getByText('Click me'));
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('saves on Enter key', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEdit value="Old value" onSave={onSave} />);

    await user.click(screen.getByText('Old value'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New value');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('New value');
    });
  });

  it('cancels on Escape key', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEdit value="Original" onSave={onSave} />);

    await user.click(screen.getByText('Original'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Modified');
    await user.keyboard('{Escape}');

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('saves on blur', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEdit value="Old" onSave={onSave} />);

    await user.click(screen.getByText('Old'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New');

    fireEvent.blur(input);

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('New');
    });
  });

  it('does not save when value unchanged', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEdit value="Same" onSave={onSave} />);

    await user.click(screen.getByText('Same'));
    await user.keyboard('{Enter}');

    expect(onSave).not.toHaveBeenCalled();
  });

  it('validates input and shows error', async () => {
    const validate = (value: string) => (value.length < 3 ? 'Too short' : null);
    const onSave = vi.fn();
    const user = userEvent.setup();

    render(<InlineEdit value="Valid" onSave={onSave} validate={validate} />);

    await user.click(screen.getByText('Valid'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Hi');
    await user.keyboard('{Enter}');

    expect(screen.getByText('Too short')).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('respects maxLength prop', async () => {
    const user = userEvent.setup();
    render(<InlineEdit value="" onSave={vi.fn()} maxLength={5} />);

    await user.click(screen.getByText('Click to edit'));
    const input = screen.getByRole('textbox') as HTMLInputElement;
    expect(input.maxLength).toBe(5);
  });

  it('renders as disabled when disabled prop is true', () => {
    const { container } = render(<InlineEdit value="Disabled" onSave={vi.fn()} disabled />);
    expect(container.querySelector('button')).not.toBeInTheDocument();
    expect(screen.getByText('Disabled')).toBeInTheDocument();
  });

  it('renders textarea for multiline mode', async () => {
    const user = userEvent.setup();
    render(<InlineEdit value="Multiline" onSave={vi.fn()} multiline />);

    await user.click(screen.getByText('Multiline'));
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
  });

  it('saves on Ctrl+Enter in multiline mode', async () => {
    const onSave = vi.fn();
    const user = userEvent.setup();
    render(<InlineEdit value="Old" onSave={onSave} multiline />);

    await user.click(screen.getByText('Old'));
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'New multiline');
    await user.keyboard('{Control>}{Enter}{/Control}');

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('New multiline');
    });
  });

  it('handles async save operations', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<InlineEdit value="Async" onSave={onSave} />);

    await user.click(screen.getByText('Async'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'New async');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith('New async');
    });
  });

  it('handles save errors', async () => {
    const onSave = vi.fn().mockRejectedValue(new Error('Save failed'));
    const user = userEvent.setup();
    render(<InlineEdit value="Error test" onSave={onSave} />);

    await user.click(screen.getByText('Error test'));
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Will fail');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument();
    });
  });

  it('applies custom className', () => {
    const { container } = render(<InlineEdit value="Custom" onSave={vi.fn()} className="custom-class" />);
    const button = container.querySelector('.custom-class');
    expect(button).toBeInTheDocument();
  });

  it('applies custom editClassName', async () => {
    const user = userEvent.setup();
    render(<InlineEdit value="Edit" onSave={vi.fn()} editClassName="edit-custom" />);

    await user.click(screen.getByText('Edit'));
    const input = screen.getByRole('textbox');
    expect(input).toHaveClass('edit-custom');
  });
});
