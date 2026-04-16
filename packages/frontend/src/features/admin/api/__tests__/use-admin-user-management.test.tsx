import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { PropsWithChildren } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAdminUserManagement } from '../use-admin-user-management';

// Hoisted Mock-Funktionen für die einzelnen API-Methoden
const { mockFindAll, mockCreate, mockUpdate, mockRemove, mockLock, mockUnlock, mockChangeOperativeRole, mockAssignStammperson } = vi.hoisted(() => ({
  mockFindAll: vi.fn(),
  mockCreate: vi.fn(),
  mockUpdate: vi.fn(),
  mockRemove: vi.fn(),
  mockLock: vi.fn(),
  mockUnlock: vi.fn(),
  mockChangeOperativeRole: vi.fn(),
  mockAssignStammperson: vi.fn(),
}));

const { mockBroadcastInvalidation } = vi.hoisted(() => ({
  mockBroadcastInvalidation: vi.fn(),
}));

vi.mock('@/shared/api/api', () => ({
  api: {
    userManagement: () => ({
      userManagementControllerFindAllVAlpha: mockFindAll,
      userManagementControllerCreateVAlpha: mockCreate,
      userManagementControllerUpdateVAlpha: mockUpdate,
      userManagementControllerRemoveVAlpha: mockRemove,
      userManagementControllerLockVAlpha: mockLock,
      userManagementControllerUnlockVAlpha: mockUnlock,
    }),
    admin: () => ({
      adminOperativeRoleControllerChangeOperativeRoleVAlpha: mockChangeOperativeRole,
      adminOperativeRoleControllerAssignStammpersonVAlpha: mockAssignStammperson,
    }),
  },
}));

vi.mock('@/shared/lib/cross-window-sync', () => ({
  broadcastInvalidation: mockBroadcastInvalidation,
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/lib/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('@/shared/lib/errors/apiErrorHandler', () => ({
  getApiErrorMessage: vi.fn(async () => 'mocked'),
}));

function createWrapper(queryClient: QueryClient) {
  return ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

describe('useAdminUserManagement - Cross-Window-Broadcast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Standard-Antwort für die Users-Query, damit der Hook ohne Fehler lädt
    mockFindAll.mockResolvedValue({ data: [] });
  });

  it('broadcastet admin.users nach erfolgreichem createUser', async () => {
    mockCreate.mockResolvedValue({ id: 'u1' });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.createUser({ username: 'neu' } as never);
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });

  it('broadcastet admin.users nach erfolgreichem updateUser', async () => {
    mockUpdate.mockResolvedValue({ id: 'u1' });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.updateUser({ id: 'u1', data: { email: 'x@y.z' } as never });
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });

  it('broadcastet admin.users nach erfolgreichem deleteUser', async () => {
    mockRemove.mockResolvedValue({ success: true });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.deleteUser({ id: 'u1' });
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });

  it('broadcastet admin.users nach erfolgreichem lockUser', async () => {
    mockLock.mockResolvedValue({ id: 'u1' });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.lockUser({ id: 'u1', reason: 'Missbrauch' });
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });

  it('broadcastet admin.users nach erfolgreichem unlockUser', async () => {
    mockUnlock.mockResolvedValue({ id: 'u1' });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.unlockUser('u1');
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });

  it('broadcastet admin.users nach erfolgreichem changeOperativeRole', async () => {
    mockChangeOperativeRole.mockResolvedValue({ id: 'u1' });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.changeOperativeRole({ id: 'u1', operativeRole: 'HELFER' as never });
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });

  it('broadcastet admin.users nach erfolgreichem assignStammperson', async () => {
    mockAssignStammperson.mockResolvedValue({ id: 'u1' });

    const queryClient = createClient();
    const { result } = renderHook(() => useAdminUserManagement(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.assignStammperson({ id: 'u1', stammpersonId: 'p1' });
    });

    await waitFor(() => {
      expect(mockBroadcastInvalidation).toHaveBeenCalledWith('admin.users');
    });
    expect(mockBroadcastInvalidation).toHaveBeenCalledTimes(1);
  });
});
