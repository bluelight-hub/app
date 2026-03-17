import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UnifiedAuthForm } from '../UnifiedAuthForm';

vi.mock('@/features/auth', () => ({
  usePublicUsers: vi.fn(() => ({
    data: [{ username: 'alice' }, { username: 'bob' }],
  })),
}));

describe('UnifiedAuthForm', () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it('should autofocus the username input on render', () => {
    render(<UnifiedAuthForm onSubmit={vi.fn()} />);

    const usernameInput = screen.getByRole('combobox', { name: 'Benutzername' });

    expect(usernameInput).toHaveFocus();
  });

  it('should announce a semantic loading state after 300ms', () => {
    vi.useFakeTimers();

    render(<UnifiedAuthForm onSubmit={vi.fn()} isLoading />);

    expect(screen.queryByText('Anmeldung wird verarbeitet. Ihre Eingaben bleiben erhalten.')).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    const pendingNotice = screen.getByText('Anmeldung wird verarbeitet. Ihre Eingaben bleiben erhalten.');

    expect(pendingNotice).toBeInTheDocument();
    expect(pendingNotice).toHaveClass('block');
  });

  it('should keep the typed username visible across rerenders with an error state', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<UnifiedAuthForm onSubmit={vi.fn()} />);

    const usernameInput = screen.getByRole('combobox', { name: 'Benutzername' });
    await user.type(usernameInput, 'alice');

    rerender(<UnifiedAuthForm onSubmit={vi.fn()} error={new Error('Server nicht erreichbar')} />);

    expect(screen.getByRole('combobox', { name: 'Benutzername' })).toHaveValue('alice');
  });

  it('should render the inline authentication error semantically', () => {
    render(<UnifiedAuthForm onSubmit={vi.fn()} error={new Error('Zugriff verweigert')} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Zugriff verweigert');
  });
});
