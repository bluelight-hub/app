import { beforeEach, describe, expect, it, vi } from 'vitest';
import { JsonResponseParseError } from '../json-response';

const mockCheckAuthRaw = vi.fn();
const mockAdminStatusRaw = vi.fn();

vi.mock('@/shared/api/api', () => ({
  api: {
    auth: () => ({
      authControllerCheckAuthRaw: mockCheckAuthRaw,
      authControllerGetAdminStatusRaw: mockAdminStatusRaw,
    }),
  },
}));

import { fetchAdminStatus, fetchAuthCheck } from '../auth-session';

describe('auth-session helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await expect(fetchAuthCheck()).resolves.toEqual({
      authenticated: true,
      isAdminAuthenticated: false,
      user: {
        id: 'user-1',
        username: 'alice',
        role: 'USER',
      },
    });
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

    await expect(fetchAdminStatus()).rejects.toBeInstanceOf(JsonResponseParseError);
  });
});
