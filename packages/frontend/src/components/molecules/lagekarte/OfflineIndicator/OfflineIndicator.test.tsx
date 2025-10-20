import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { OfflineIndicator } from './OfflineIndicator';

describe('OfflineIndicator', () => {
  let onlineGetter: PropertyDescriptor | undefined;

  beforeEach(() => {
    // Reset console mocks
    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Save original navigator.onLine getter
    onlineGetter = Object.getOwnPropertyDescriptor(window.navigator, 'onLine');
  });

  afterEach(() => {
    // Restore original navigator.onLine if it existed
    if (onlineGetter) {
      Object.defineProperty(window.navigator, 'onLine', onlineGetter);
    }
  });

  const mockNavigatorOnline = (isOnline: boolean) => {
    Object.defineProperty(window.navigator, 'onLine', {
      configurable: true,
      writable: true,
      value: isOnline,
    });
  };

  it('should render "Online" badge when online', () => {
    mockNavigatorOnline(true);

    render(<OfflineIndicator />);

    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Online-Modus');
  });

  it('should render "Offline-Modus" badge when offline', () => {
    mockNavigatorOnline(false);

    render(<OfflineIndicator />);

    expect(screen.getByText('Offline-Modus')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Offline-Modus');
  });

  it('should switch to "Offline-Modus" when window goes offline', async () => {
    mockNavigatorOnline(true);

    render(<OfflineIndicator />);

    // Initially online
    expect(screen.getByText('Online')).toBeInTheDocument();

    // Simulate offline event
    mockNavigatorOnline(false);
    window.dispatchEvent(new Event('offline'));

    // Wait for state update
    await waitFor(() => {
      expect(screen.getByText('Offline-Modus')).toBeInTheDocument();
    });
  });

  it('should switch to "Online" when window comes back online', async () => {
    mockNavigatorOnline(false);

    render(<OfflineIndicator />);

    // Initially offline
    expect(screen.getByText('Offline-Modus')).toBeInTheDocument();

    // Simulate online event
    mockNavigatorOnline(true);
    window.dispatchEvent(new Event('online'));

    // Wait for state update
    await waitFor(() => {
      expect(screen.getByText('Online')).toBeInTheDocument();
    });
  });

  it('should log status changes', async () => {
    mockNavigatorOnline(true);

    render(<OfflineIndicator />);

    // Check initial log
    expect(console.log).toHaveBeenCalledWith('[OfflineIndicator] Initial status: Online');

    // Clear previous logs
    vi.clearAllMocks();

    // Simulate offline event
    mockNavigatorOnline(false);
    window.dispatchEvent(new Event('offline'));

    // Wait for log
    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('[OfflineIndicator] Status: Offline');
    });

    // Clear and test online event
    vi.clearAllMocks();

    mockNavigatorOnline(true);
    window.dispatchEvent(new Event('online'));

    await waitFor(() => {
      expect(console.log).toHaveBeenCalledWith('[OfflineIndicator] Status: Online');
    });
  });

  it('should have correct styling for online state', () => {
    mockNavigatorOnline(true);

    render(<OfflineIndicator />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-green-50/90');
    expect(badge).toHaveClass('text-green-700');
  });

  it('should have correct styling for offline state', () => {
    mockNavigatorOnline(false);

    render(<OfflineIndicator />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveClass('bg-red-50/90');
    expect(badge).toHaveClass('text-red-700');
  });

  it('should have ARIA live region for accessibility', () => {
    mockNavigatorOnline(true);

    render(<OfflineIndicator />);

    const badge = screen.getByRole('status');
    expect(badge).toHaveAttribute('aria-live', 'polite');
  });

  it('should cleanup event listeners on unmount', () => {
    mockNavigatorOnline(true);

    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { unmount } = render(<OfflineIndicator />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });
});
