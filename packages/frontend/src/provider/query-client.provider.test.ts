import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';
import { createAppQueryClient } from './query-client.provider';
import * as errorHandlerModule from '@/shared/lib/errors/error-handler';

function createResponseError(status: number, url: string) {
  return {
    response: {
      status,
      url,
    },
  };
}

describe('createAppQueryClient', () => {
  it('creates isolated QueryClient instances with shared defaults', () => {
    const clientA = createAppQueryClient();
    const clientB = createAppQueryClient();

    expect(clientA).toBeInstanceOf(QueryClient);
    expect(clientB).toBeInstanceOf(QueryClient);
    expect(clientA).not.toBe(clientB);
    expect(clientA.getDefaultOptions().queries?.throwOnError).toBe(false);
    expect(clientA.getDefaultOptions().mutations?.retry).toBe(false);
    expect(clientA.getDefaultOptions().mutations?.throwOnError).toBe(false);
  });

  it('uses the global retry policy for auth, client and server errors', () => {
    const client = createAppQueryClient();
    const retry = client.getDefaultOptions().queries?.retry;

    expect(typeof retry).toBe('function');

    const shouldRetry = retry as (failureCount: number, error: unknown) => boolean;

    expect(shouldRetry(0, createResponseError(401, 'https://localhost:3091/api/v-alpha/einsaetze'))).toBe(true);
    expect(shouldRetry(1, createResponseError(401, 'https://localhost:3091/api/v-alpha/einsaetze'))).toBe(false);
    expect(shouldRetry(0, createResponseError(401, 'https://localhost:3091/api/auth/refresh'))).toBe(false);
    expect(shouldRetry(0, createResponseError(404, 'https://localhost:3091/api/v-alpha/einsaetze'))).toBe(false);
    expect(shouldRetry(0, createResponseError(503, 'https://localhost:3091/api/v-alpha/einsaetze'))).toBe(false);
    expect(shouldRetry(1, createResponseError(502, 'https://localhost:3091/api/v-alpha/einsaetze'))).toBe(true);
    expect(shouldRetry(2, createResponseError(502, 'https://localhost:3091/api/v-alpha/einsaetze'))).toBe(false);
  });

  describe('Zero-Toast-Policy: meta.silentError (Story 1.6 AC8)', () => {
    it('skippt handleQueryError, wenn query.meta.silentError === true', async () => {
      const spy = vi.spyOn(errorHandlerModule, 'handleQueryError').mockResolvedValue(undefined);
      const client = createAppQueryClient();

      await expect(
        client.fetchQuery({
          queryKey: ['silent-test'],
          queryFn: () => Promise.reject(createResponseError(403, 'https://localhost:3091/api/v-alpha/silent')),
          retry: false,
          meta: { silentError: true },
        }),
      ).rejects.toBeDefined();

      expect(spy).not.toHaveBeenCalled();
      spy.mockRestore();
    });

    it('ruft handleQueryError weiterhin, wenn meta.silentError fehlt oder false ist', async () => {
      const spy = vi.spyOn(errorHandlerModule, 'handleQueryError').mockResolvedValue(undefined);
      const client = createAppQueryClient();

      await expect(
        client.fetchQuery({
          queryKey: ['loud-test'],
          queryFn: () => Promise.reject(createResponseError(500, 'https://localhost:3091/api/v-alpha/loud')),
          retry: false,
        }),
      ).rejects.toBeDefined();

      expect(spy).toHaveBeenCalledTimes(1);
      spy.mockRestore();
    });
  });
});
