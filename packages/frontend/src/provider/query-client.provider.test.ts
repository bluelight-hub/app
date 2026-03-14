import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { createAppQueryClient } from './query-client.provider';

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
});
