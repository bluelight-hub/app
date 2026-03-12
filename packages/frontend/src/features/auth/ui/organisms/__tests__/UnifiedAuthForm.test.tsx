import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
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
  function FailedLoginHarness() {
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    return (
      <div className="auth-theme" data-testid="auth-theme">
        <UnifiedAuthForm
          onSubmit={async () => {
            setErrorMessage('Benutzerprofil konnte nicht angemeldet werden.');
          }}
          errorMessage={errorMessage}
          onValueChange={() => setErrorMessage(null)}
        />
      </div>
    );
  }

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

  it('deaktiviert Autokorrektur für die Benutzer-Combobox', () => {
    render(
      <div className="auth-theme">
        <UnifiedAuthForm onSubmit={vi.fn()} />
      </div>,
    );

    const combobox = screen.getByRole('combobox', { name: /benutzername/i });

    expect(combobox).toHaveAttribute('autocomplete', 'off');
    expect(combobox).toHaveAttribute('autocorrect', 'off');
    expect(combobox).toHaveAttribute('autocapitalize', 'none');
    expect(combobox).toHaveAttribute('spellcheck', 'false');
  });

  it('zeigt Auth-Fehler inline mit Alert-Semantik an und behält den Benutzernamen bei', async () => {
    const user = userEvent.setup();

    render(<FailedLoginHarness />);

    const combobox = screen.getByRole('combobox', { name: /benutzername/i });

    await user.type(combobox, 'rubeen');
    await user.click(screen.getByRole('button', { name: /anmeldung starten/i }));

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent('Benutzerprofil konnte nicht angemeldet werden.');
    expect(combobox).toHaveValue('rubeen');
    expect(combobox).toHaveAttribute('aria-invalid', 'true');
  });

  it('behält den Inline-Fehler beim reinen Fokussieren bei und löscht ihn erst nach echter Wertänderung', async () => {
    const user = userEvent.setup();

    render(<FailedLoginHarness />);

    const combobox = screen.getByRole('combobox', { name: /benutzername/i });

    await user.type(combobox, 'rubeen');
    await user.click(screen.getByRole('button', { name: /anmeldung starten/i }));

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Benutzerprofil konnte nicht angemeldet werden.');

    await user.click(combobox);
    expect(screen.getByRole('alert')).toHaveTextContent('Benutzerprofil konnte nicht angemeldet werden.');

    await user.type(combobox, '1');

    await waitFor(() => {
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  it('hält die Combobox nach einer fehlgeschlagenen Anmeldung weiter nutzbar', async () => {
    const user = userEvent.setup();

    render(<FailedLoginHarness />);

    const combobox = screen.getByRole('combobox', { name: /benutzername/i });

    await user.type(combobox, 'rubeen');
    await user.click(screen.getByRole('button', { name: /anmeldung starten/i }));

    await screen.findByRole('alert');

    await user.clear(combobox);
    await user.click(combobox);

    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'admin' })).toBeInTheDocument();
    });
  });
});
