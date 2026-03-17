import { AdminApi, AuthApi, Configuration, HealthApi } from '@bluelight-hub/shared/client';

export interface ServerScopedClientOptions {
  fetchApi?: typeof fetch;
}

export function normalizeServerBaseUrl(serverUrl: string): string {
  return serverUrl.endsWith('/') ? serverUrl.slice(0, -1) : serverUrl;
}

function createServerScopedConfiguration(serverUrl: string, options: ServerScopedClientOptions = {}): Configuration {
  return new Configuration({
    basePath: normalizeServerBaseUrl(serverUrl),
    credentials: 'include',
    fetchApi: options.fetchApi,
  });
}

/**
 * Erlaubte Ausnahme für servergebundene Pre-Session-Flows wie Invite-Exchange
 * oder Admin-Setup. Diese Clients leben bewusst zentral in `shared/api`.
 */
export function createServerScopedAuthApi(serverUrl: string, options: ServerScopedClientOptions = {}): AuthApi {
  return new AuthApi(createServerScopedConfiguration(serverUrl, options));
}

export function createServerScopedAdminApi(serverUrl: string, options: ServerScopedClientOptions = {}): AdminApi {
  return new AdminApi(createServerScopedConfiguration(serverUrl, options));
}

export function createServerScopedHealthApi(serverUrl: string, options: ServerScopedClientOptions = {}): HealthApi {
  return new HealthApi(createServerScopedConfiguration(serverUrl, options));
}
