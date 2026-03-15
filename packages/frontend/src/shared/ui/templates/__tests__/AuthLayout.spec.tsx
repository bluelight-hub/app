import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthLayout } from '../AuthLayout';

vi.mock('@/features/server/ui/molecules/BrowserSecurityBanner', () => ({
  BrowserSecurityBanner: () => <div data-testid="browser-security-banner" />,
}));

vi.mock('@/shared/ui/molecules/color-mode-button.molecule', () => ({
  ColorModeButton: () => <button type="button">Farbmodus</button>,
}));

describe('AuthLayout', () => {
  it('renders the Ring-1 Einstieg scaffold around its children', () => {
    render(
      <AuthLayout>
        <div>Inhalt</div>
      </AuthLayout>,
    );

    expect(screen.getByTestId('browser-security-banner')).toBeInTheDocument();
    expect(screen.getByTestId('auth-layout-shell')).toBeInTheDocument();
    expect(screen.getByTestId('auth-layout-ambient')).toHaveClass('ring-1-auth-ambient');
    expect(screen.getByTestId('auth-layout-top-glow')).toHaveClass('ring-1-auth-top-glow');
    expect(screen.getByRole('button', { name: 'Farbmodus' })).toBeInTheDocument();
    expect(screen.getByText('Inhalt')).toBeInTheDocument();
  });

  it('does not render implementation-describing helper content in the product shell', () => {
    render(
      <AuthLayout>
        <div>Form</div>
      </AuthLayout>,
    );

    expect(screen.queryByTestId('auth-layout-helper-panel')).not.toBeInTheDocument();
    expect(screen.queryByText('Ring 1 bereit')).not.toBeInTheDocument();
    expect(screen.queryByText('Lesbar, dicht und keyboard-first')).not.toBeInTheDocument();
  });
});
