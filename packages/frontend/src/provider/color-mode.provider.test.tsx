import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

const mockThemeProvider = vi.fn();

vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }: { children: ReactNode }) => {
    mockThemeProvider(props);
    return <div data-testid="mock-theme-provider">{children}</div>;
  },
}));

import { ColorModeProvider } from './color-mode.provider';

describe('ColorModeProvider', () => {
  it('verdrahtet next-themes mit dem Ring-1-Standardfluss', () => {
    render(
      <ColorModeProvider>
        <span>content</span>
      </ColorModeProvider>,
    );

    expect(screen.getByTestId('mock-theme-provider')).toHaveTextContent('content');
    expect(mockThemeProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        attribute: 'class',
        defaultTheme: 'system',
        disableTransitionOnChange: true,
        enableColorScheme: true,
        enableSystem: true,
        storageKey: 'theme',
      }),
    );
  });
});
