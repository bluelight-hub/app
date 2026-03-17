import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockToastError, mockToastWarning, mockRedirectWithRouter } = vi.hoisted(() => ({
  mockToastError: vi.fn(),
  mockToastWarning: vi.fn(),
  mockRedirectWithRouter: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    error: mockToastError,
    warning: mockToastWarning,
  },
}));

vi.mock('@/shared/lib/server-access-token', () => ({
  isSetupRedirectInProgress: vi.fn(() => false),
}));

vi.mock('@/shared/lib/navigation/router-redirect', () => ({
  getCurrentPathWithQueryAndHash: vi.fn(() => '/auth'),
  redirectWithRouter: mockRedirectWithRouter,
  sanitizeInternalRedirectPath: vi.fn(),
}));

import { handleQueryError } from './error-handler';

function createNetworkError(message = 'Failed to fetch') {
  return Object.assign(new Error(message), {
    cause: {
      message,
    },
  });
}

function createUnauthorizedQueryError() {
  return {
    response: {
      status: 401,
      url: '/api/v-alpha/auth/check',
      headers: {
        get: vi.fn(() => null),
      },
    },
  };
}

describe('handleQueryError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/auth');
  });

  it('suppresses global network toasts on the auth route', async () => {
    await handleQueryError(createNetworkError());

    expect(mockToastError).not.toHaveBeenCalled();
    expect(mockToastWarning).not.toHaveBeenCalled();
  });

  it('keeps global network toasts outside the auth route', async () => {
    window.history.replaceState({}, '', '/app');

    await handleQueryError(createNetworkError());

    expect(mockToastError).toHaveBeenCalledWith(
      'Verbindungsfehler',
      expect.objectContaining({
        description: 'Netzwerkfehler: Bitte überprüfen Sie Ihre Internetverbindung.',
      }),
    );
  });

  it('unterdrückt 401-Redirects auf der Server-Verwaltungsseite', async () => {
    window.history.replaceState({}, '', '/server/manage');

    await handleQueryError(createUnauthorizedQueryError());

    expect(mockToastWarning).not.toHaveBeenCalled();
    expect(mockRedirectWithRouter).not.toHaveBeenCalled();
  });
});
