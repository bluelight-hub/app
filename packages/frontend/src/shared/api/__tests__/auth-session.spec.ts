import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { QueryFunctionContext } from '@tanstack/react-query';
import { JsonResponseParseError } from '../json-response';

const mockCheckAuthRaw = vi.fn();
const mockAdminStatusRaw = vi.fn();
const mockCreateServerScopedAuthApi = vi.fn();

vi.mock('@/shared/api/server-scoped-clients', () => ({
  createServerScopedAuthApi: (...args: unknown[]) => mockCreateServerScopedAuthApi(...args),
}));

import { fetchAdminStatus, fetchAuthCheck } from '../auth-session';

describe('auth-session helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateServerScopedAuthApi.mockReturnValue({
      authControllerCheckAuthRaw: mockCheckAuthRaw,
      authControllerGetAdminStatusRaw: mockAdminStatusRaw,
    });
  });

  it('parst auth/check zentral über den Raw-Wrapper', async () => {
    mockCheckAuthRaw.mockResolvedValue({
      raw: new Response(
        JSON.stringify({
          authenticated: true,
          isAdminAuthenticated: false,
          user: {
            id: 'user-1',
            username: 'alice',
            role: 'USER',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    });

    await expect(
      fetchAuthCheck({
        queryKey: ['auth', 'check', 'https://server-1.example.com'],
      } as QueryFunctionContext<readonly unknown[]>),
    ).resolves.toEqual({
      authenticated: true,
      isAdminAuthenticated: false,
      user: {
        id: 'user-1',
        username: 'alice',
        role: 'USER',
      },
    });
    expect(mockCreateServerScopedAuthApi).toHaveBeenCalledWith(
      'https://server-1.example.com',
      expect.objectContaining({
        fetchApi: expect.any(Function),
      }),
    );
  });

  it('wirft bei ungültiger admin/status-Antwort einen Parse-Fehler', async () => {
    mockAdminStatusRaw.mockResolvedValue({
      raw: new Response(
        JSON.stringify({
          adminSetupAvailable: 'ja',
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      ),
    });

    await expect(
      fetchAdminStatus({
        queryKey: ['auth', 'admin', 'status', 'https://server-1.example.com'],
      } as QueryFunctionContext<readonly unknown[]>),
    ).rejects.toBeInstanceOf(JsonResponseParseError);
    expect(mockCreateServerScopedAuthApi).toHaveBeenCalledWith(
      'https://server-1.example.com',
      expect.objectContaining({
        fetchApi: expect.any(Function),
      }),
    );
  });

  it('verlangt einen gültigen Server-Scope im Query-Key', async () => {
    await expect(
      fetchAuthCheck({
        queryKey: ['auth', 'check', 'unconfigured'],
      } as QueryFunctionContext<readonly unknown[]>),
    ).rejects.toThrow('gültigen Server-Scope');
  });
});
