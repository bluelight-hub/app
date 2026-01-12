/**
 * Unit Tests: useRequireServer Hook - Toast Behavior
 *
 * Tests Toast-Anzeige bei Redirect zu /server/setup:
 * - AC3 (Story 3.2): Toast.info wenn Redirect ausgelöst wird
 * - Kein Toast wenn Server existieren
 * - Kein Toast während Hydration
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { toast } from 'sonner';

// Mock Dependencies
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
  },
}));

vi.mock('@tanstack/react-router', () => ({
  useNavigate: vi.fn(),
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/lib/server-access-token', () => ({
  isSetupRedirectInProgress: vi.fn().mockReturnValue(false),
}));

// Import after mocking
import { useNavigate } from '@tanstack/react-router';
import { serverStore } from '../../stores/server.store';
import { useRequireServer } from '../use-require-server';
import { isSetupRedirectInProgress } from '@/shared/lib/server-access-token';

describe('useRequireServer - Toast Behavior (Story 3.2, AC3)', () => {
  let mockNavigate: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Setup navigate mock
    mockNavigate = vi.fn();
    vi.mocked(useNavigate).mockReturnValue(mockNavigate);

    // Reset store to default state
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });

    // Reset setup redirect flag
    vi.mocked(isSetupRedirectInProgress).mockReturnValue(false);

    // Mock window.location.pathname (nicht auf /server/setup)
    Object.defineProperty(window, 'location', {
      value: { pathname: '/auth' },
      writable: true,
    });
  });

  it('should show toast.info when redirecting to setup (AC3)', async () => {
    // Given: No servers configured and store is hydrated
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: true,
    });

    // When
    renderHook(() => useRequireServer());

    // Then: Toast.info shown with correct message
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Bitte füge zuerst einen Server hinzu');
    });

    // And: Navigate to /server/setup
    expect(mockNavigate).toHaveBeenCalledWith({ to: '/server/setup', replace: true });
  });

  it('should NOT show toast when servers exist', async () => {
    // Given: At least one server configured
    serverStore.setState({
      servers: [
        {
          id: 'server-1',
          name: 'Test Server',
          baseUrl: 'https://test.example.com',
          accessToken: 'token',
          createdAt: new Date().toISOString(),
        },
      ],
      activeServerId: 'server-1',
      connectionStatus: new Map(),
      isHydrated: true,
    });

    // When
    renderHook(() => useRequireServer());

    // Then: No toast shown
    await waitFor(() => {
      expect(toast.info).not.toHaveBeenCalled();
    });

    // And: No navigation
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should NOT show toast during hydration', async () => {
    // Given: Store is not yet hydrated
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });

    // When
    renderHook(() => useRequireServer());

    // Then: No toast shown (waiting for hydration)
    await waitFor(() => {
      expect(toast.info).not.toHaveBeenCalled();
    });

    // And: No navigation
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should show toast after hydration completes with no servers', async () => {
    // Given: Store starts not hydrated
    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: false,
    });

    // When: Hook rendered before hydration
    renderHook(() => useRequireServer());

    // Then: No toast yet
    expect(toast.info).not.toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();

    // When: Hydration completes
    act(() => {
      serverStore.setState((prev) => ({
        ...prev,
        isHydrated: true,
      }));
    });

    // Then: Toast shown after hydration
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Bitte füge zuerst einen Server hinzu');
    });

    expect(mockNavigate).toHaveBeenCalledWith({ to: '/server/setup', replace: true });
  });

  it('should NOT show toast when already on /server/setup', async () => {
    // Given: Already on setup page
    Object.defineProperty(window, 'location', {
      value: { pathname: '/server/setup' },
      writable: true,
    });

    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: true,
    });

    // When
    renderHook(() => useRequireServer());

    // Then: No toast (prevents loop)
    await waitFor(() => {
      expect(toast.info).not.toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should NOT show toast when 503 setup redirect is in progress', async () => {
    // Given: 503 redirect already in progress
    vi.mocked(isSetupRedirectInProgress).mockReturnValue(true);

    serverStore.setState({
      servers: [],
      activeServerId: null,
      connectionStatus: new Map(),
      isHydrated: true,
    });

    // When
    renderHook(() => useRequireServer());

    // Then: No toast (M6 FIX - prevents double redirect)
    await waitFor(() => {
      expect(toast.info).not.toHaveBeenCalled();
    });

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
