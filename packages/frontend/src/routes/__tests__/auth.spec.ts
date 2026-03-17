import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreateFileRoute = vi.fn(() => (config: unknown) => config);
const mockRedirect = vi.fn((options: unknown) => ({ redirect: options }));

const mockServerStoreState = {
  isHydrated: true,
  servers: [] as Array<{ id: string }>,
};

const mockIsSetupRedirectInProgress = vi.fn(() => false);
const mockSetSetupRedirectInProgress = vi.fn();

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: mockCreateFileRoute,
  redirect: mockRedirect,
}));

vi.mock('@/features/auth/ui', () => ({
  LoginWindow: () => null,
}));

vi.mock('@/shared/lib/server-access-token', () => ({
  isSetupRedirectInProgress: mockIsSetupRedirectInProgress,
  setSetupRedirectInProgress: mockSetSetupRedirectInProgress,
}));

vi.mock('@/features/server/stores/server.store', () => ({
  serverStore: {
    get state() {
      return mockServerStoreState;
    },
  },
}));

describe('Route /auth beforeLoad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerStoreState.isHydrated = true;
    mockServerStoreState.servers = [];
    mockIsSetupRedirectInProgress.mockReturnValue(false);
  });

  it('redirects to /server/setup when a setup redirect is active and no servers exist', async () => {
    mockIsSetupRedirectInProgress.mockReturnValue(true);

    const { Route } = await import('../auth');
    let thrownValue: unknown;

    try {
      (Route as { beforeLoad: () => void }).beforeLoad();
    } catch (error) {
      thrownValue = error;
    }

    expect(thrownValue).toEqual({
      redirect: { to: '/server/setup' },
    });
  });

  it('resets a stale setup redirect flag when servers already exist', async () => {
    mockIsSetupRedirectInProgress.mockReturnValue(true);
    mockServerStoreState.servers = [{ id: 'server-1' }];

    const { Route } = await import('../auth');

    expect(() => (Route as { beforeLoad: () => void }).beforeLoad()).not.toThrow();
    expect(mockSetSetupRedirectInProgress).toHaveBeenCalledWith(false);
  });
});
