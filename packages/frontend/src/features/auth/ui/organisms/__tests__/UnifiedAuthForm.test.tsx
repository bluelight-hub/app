import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UnifiedAuthForm } from '../UnifiedAuthForm';

vi.mock('@/features/auth', () => ({
  usePublicUsers: vi.fn(() => ({
    data: [{ username: 'alice' }, { username: 'bob' }],
  })),
}));

describe('UnifiedAuthForm', () => {
  it('should autofocus the username input on render', () => {
    render(<UnifiedAuthForm onSubmit={vi.fn()} />);

    const usernameInput = screen.getByRole('combobox', { name: 'Benutzername' });

    expect(usernameInput).toHaveFocus();
  });
});
