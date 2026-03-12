import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedAuthForm } from '../UnifiedAuthForm';

vi.mock('@/features/auth', () => ({
  usePublicUsers: vi.fn(() => ({
    data: [
      { id: 'user-1', username: 'rubeen' },
      { id: 'user-2', username: 'admin' },
    ],
  })),
}));

describe('UnifiedAuthForm', () => {
  it('rendert das Benutzer-Dropdown innerhalb des Auth-Themes', async () => {
    const user = userEvent.setup();

    render(
      <div className="auth-theme" data-testid="auth-theme">
        <UnifiedAuthForm onSubmit={vi.fn()} />
      </div>,
    );

    await user.click(screen.getByRole('combobox', { name: /benutzername/i }));

    const authTheme = screen.getByTestId('auth-theme');
    const listbox = await screen.findByRole('listbox', { name: /benutzername/i });

    expect(authTheme.contains(listbox)).toBe(true);
    expect(listbox.parentElement).toHaveClass('z-[70]');
  });

  it('zeigt bestehende Benutzer im Dropdown an', async () => {
    const user = userEvent.setup();

    render(
      <div className="auth-theme">
        <UnifiedAuthForm onSubmit={vi.fn()} />
      </div>,
    );

    await user.click(screen.getByRole('combobox', { name: /benutzername/i }));

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'rubeen' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'admin' })).toBeInTheDocument();
    });
  });
});
