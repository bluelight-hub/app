import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Logo from './Logo';

// Mock den useTheme Hook
vi.mock('../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
    isDark: false,
    isAuto: false,
    setIsDark: vi.fn(),
    setAutoTheme: vi.fn(),
    toggleTheme: vi.fn(),
  }),
}));

// Mock die Bilder
vi.mock('../../assets/brandbook/mobile-logo.png', () => ({
  default: 'mocked-light-logo-path',
}));

vi.mock('../../assets/brandbook/mobile-white.png', () => ({
  default: 'mocked-dark-logo-path',
}));

describe('Logo', () => {
  // Unit Test - Grundlegendes Rendering
  it('should render without crashing', () => {
    const { container } = render(<Logo data-testid="logo" />);
    const logoElement = container.firstChild;
    expect(logoElement).toBeInTheDocument();
    expect(logoElement).toHaveAttribute('alt', 'BlueLight Hub');
  });

  // Unit Test - Custom className wird korrekt angewendet
  it('should apply custom className', () => {
    render(<Logo className="custom-logo-class" data-testid="logo" />);
    const logoElement = screen.getByTestId('logo');
    expect(logoElement).toHaveClass('custom-logo-class');
  });

  // Integration Test - Verhalten im Layout
  it('should work properly in a layout context', () => {
    render(
      <div data-testid="container">
        <header>
          <Logo data-testid="logo" />
        </header>
      </div>,
    );

    const container = screen.getByTestId('container');
    const logoElement = screen.getByTestId('logo');
    expect(container).toContainElement(logoElement);
  });

  // Snapshot Test
  it('should match snapshot', () => {
    const { container } = render(<Logo data-testid="logo" />);
    expect(container).toMatchSnapshot();
  });
});
