/**
 * Unit Tests für BrowserSecurityBanner Component
 *
 * Tests für Browser-Sicherheitswarnung mit Tauri-Detection und Dismiss-Funktionalität.
 * Folgt AAA Pattern (Arrange-Act-Assert) mit Given-When-Then Kommentaren.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BrowserSecurityBanner } from './BrowserSecurityBanner';

// Mock useIsTauri hook
vi.mock('@/shared/hooks/useIsTauri', () => ({
  useIsTauri: vi.fn(() => ({ isTauri: false })), // Default: Browser mode
}));

// Mock useBrowserWarningDismissed hook
const mockDismiss = vi.fn();
vi.mock('../../hooks/use-browser-warning-dismissed', () => ({
  useBrowserWarningDismissed: vi.fn(() => ({
    isDismissed: false,
    dismiss: mockDismiss,
  })),
}));

// Import mocked modules for type safety
import { useIsTauri } from '@/shared/hooks/useIsTauri';
import { useBrowserWarningDismissed } from '../../hooks/use-browser-warning-dismissed';

describe('BrowserSecurityBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset to browser mode by default
    vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });
    vi.mocked(useBrowserWarningDismissed).mockReturnValue({
      isDismissed: false,
      dismiss: mockDismiss,
    });
  });

  describe('Browser Mode Rendering', () => {
    it('should render warning text in browser mode', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      expect(screen.getByText('Im Browser werden Server-Daten unverschlüsselt gespeichert. Für maximale Sicherheit nutze die Desktop-App.')).toBeInTheDocument();
    });

    it('should render warning icon', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
      expect(icon).toHaveClass('text-amber-600');
      expect(icon).toHaveAttribute('aria-hidden', 'true');
    });

    it('should render dismiss button', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      const dismissButton = screen.getByRole('button', {
        name: 'Browser-Sicherheitswarnung für diese Sitzung ausblenden',
      });
      expect(dismissButton).toBeInTheDocument();
    });

    it('should have correct ARIA attributes', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      const alert = container.firstChild as HTMLElement;
      expect(alert).toHaveAttribute('role', 'alert');
      expect(alert).toHaveAttribute('aria-live', 'polite');
    });
  });

  describe('Tauri Mode (AC5)', () => {
    it('should NOT render in Tauri mode', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: true });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      expect(container.firstChild).toBeNull();
    });

    it('should return null when isTauri is true', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: true });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      expect(screen.queryByText(/Im Browser werden Server-Daten/)).not.toBeInTheDocument();
    });
  });

  describe('Dismissed State', () => {
    it('should NOT render when dismissed', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });
      vi.mocked(useBrowserWarningDismissed).mockReturnValue({
        isDismissed: true,
        dismiss: mockDismiss,
      });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      expect(container.firstChild).toBeNull();
    });

    it('should return null when isDismissed is true', () => {
      // Given (Arrange)
      vi.mocked(useBrowserWarningDismissed).mockReturnValue({
        isDismissed: true,
        dismiss: mockDismiss,
      });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      expect(screen.queryByText(/Im Browser werden Server-Daten/)).not.toBeInTheDocument();
    });
  });

  describe('Dismiss Button Behavior', () => {
    it('should call dismiss function when button is clicked', async () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });
      const user = userEvent.setup();

      render(<BrowserSecurityBanner />);

      const dismissButton = screen.getByRole('button', {
        name: 'Browser-Sicherheitswarnung für diese Sitzung ausblenden',
      });

      // When (Act)
      await user.click(dismissButton);

      // Then (Assert)
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });

    it('should have correct aria-label on dismiss button', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      const button = screen.getByRole('button', { name: 'Browser-Sicherheitswarnung für diese Sitzung ausblenden' });
      expect(button).toHaveAttribute('aria-label', 'Browser-Sicherheitswarnung für diese Sitzung ausblenden');
    });

    it('should be keyboard accessible', async () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });
      const user = userEvent.setup();

      render(<BrowserSecurityBanner />);

      const dismissButton = screen.getByRole('button', {
        name: 'Browser-Sicherheitswarnung für diese Sitzung ausblenden',
      });

      // When (Act)
      dismissButton.focus();
      await user.keyboard('{Enter}');

      // Then (Assert)
      expect(mockDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe('Styling', () => {
    it('should have correct warning colors', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('bg-amber-50/90');
      expect(wrapper).toHaveClass('border-amber-200/80');
    });

    it('should keep the banner layout inline instead of sticky', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).not.toHaveClass('sticky');
      expect(wrapper).toHaveClass('rounded-2xl');
    });

    it('should have correct text styling', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      const text = screen.getByText(/Im Browser werden Server-Daten/);
      expect(text).toHaveClass('text-sm');
      expect(text).toHaveClass('text-amber-900');
    });
  });

  describe('Custom Props', () => {
    it('should apply custom className when provided', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });
      const customClassName = 'my-custom-class';

      // When (Act)
      const { container } = render(<BrowserSecurityBanner className={customClassName} />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('my-custom-class');
    });

    it('should merge custom className with default classes', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });
      const customClassName = 'shadow-lg';

      // When (Act)
      const { container } = render(<BrowserSecurityBanner className={customClassName} />);

      // Then (Assert)
      const wrapper = container.firstChild as HTMLElement;
      // Custom class
      expect(wrapper).toHaveClass('shadow-lg');
      // Default classes should remain
      expect(wrapper).toHaveClass('rounded-2xl');
      expect(wrapper).toHaveClass('bg-amber-50/90');
      expect(wrapper).toHaveClass('border-amber-200/80');
    });
  });

  describe('Accessibility', () => {
    it('should have focus ring styles on dismiss button', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      render(<BrowserSecurityBanner />);

      const button = screen.getByRole('button', { name: 'Browser-Sicherheitswarnung für diese Sitzung ausblenden' });

      // Then (Assert)
      expect(button).toHaveClass('focus:outline-none');
      expect(button).toHaveClass('focus:ring-2');
      expect(button).toHaveClass('focus:ring-amber-500');
    });

    it('should have hidden icon for screen readers', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      const icons = container.querySelectorAll('svg[aria-hidden="true"]');
      expect(icons.length).toBeGreaterThanOrEqual(1);
    });

    it('should have aria-labelledby pointing to warning text', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      const { container } = render(<BrowserSecurityBanner />);

      // Then (Assert)
      const alert = container.firstChild as HTMLElement;
      expect(alert).toHaveAttribute('aria-labelledby', 'browser-security-warning-text');
    });

    it('should have id on warning text element for aria-labelledby reference', () => {
      // Given (Arrange)
      vi.mocked(useIsTauri).mockReturnValue({ isTauri: false });

      // When (Act)
      render(<BrowserSecurityBanner />);

      // Then (Assert)
      const warningText = screen.getByText(/Im Browser werden Server-Daten/);
      expect(warningText).toHaveAttribute('id', 'browser-security-warning-text');
    });
  });
});
