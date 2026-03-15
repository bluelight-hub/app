import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mockUseColorMode = vi.fn();

vi.mock('@/shared/hooks/use-color-mode', () => ({
  useColorMode: () => mockUseColorMode(),
}));

vi.mock('@/shared/ui/atoms/color-mode-icon.atom', () => ({
  ColorModeIcon: () => <span data-testid="color-mode-icon" />,
}));

import { ColorModeButton } from '../color-mode-button.molecule';

describe('ColorModeButton molecule', () => {
  it('rendert den Ring-1-Themeschalter mit semantischen Surface-Tokens', async () => {
    const toggleColorMode = vi.fn();
    mockUseColorMode.mockReturnValue({
      colorMode: 'light',
      resolvedColorMode: 'light',
      setColorMode: vi.fn(),
      toggleColorMode,
    });

    render(<ColorModeButton />);

    const button = await waitFor(() => screen.getByRole('button', { name: 'Zu Dunkelmodus wechseln' }));
    expect(button).toHaveClass('border-border-subtle');
    expect(button).toHaveClass('bg-surface-overlay');
    expect(button).toHaveClass('text-text-secondary');
    expect(screen.getByTestId('color-mode-icon')).toBeInTheDocument();

    fireEvent.click(button);
    expect(toggleColorMode).toHaveBeenCalledTimes(1);
  });

  it('merge-t optionale Klassen, ohne den Ring-1-Grundvertrag zu verlieren', async () => {
    mockUseColorMode.mockReturnValue({
      colorMode: 'dark',
      resolvedColorMode: 'dark',
      setColorMode: vi.fn(),
      toggleColorMode: vi.fn(),
    });

    render(<ColorModeButton className="ring-2 ring-focus-ring" />);

    const button = await waitFor(() => screen.getByRole('button', { name: 'Zu Systemmodus wechseln' }));
    expect(button).toHaveClass('border-border-subtle');
    expect(button).toHaveClass('ring-2');
    expect(button).toHaveClass('ring-focus-ring');
  });
});
