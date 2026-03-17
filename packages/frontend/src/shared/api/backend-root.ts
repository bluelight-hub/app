import { z } from 'zod';
import { fetchWithRefresh } from './fetchWithRefresh';
import { parseJsonResponse } from './json-response';

export const backendRootResponseSchema = z
  .object({
    message: z.string(),
    version: z.string().optional(),
    endpoints: z
      .object({
        api: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export type BackendRootResponse = z.infer<typeof backendRootResponseSchema>;

/**
 * Root-Response ist aktuell ein Generator-Gap und bleibt deshalb zentral
 * in `shared/api` gekapselt.
 */
export async function fetchBackendRoot(baseUrl: string): Promise<BackendRootResponse> {
  const response = await fetchWithRefresh(baseUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch backend root: ${response.status}`);
  }

  return parseJsonResponse(response, backendRootResponseSchema, 'backend root');
}

export async function fetchBackendVersion(baseUrl: string): Promise<string | undefined> {
  const root = await fetchBackendRoot(baseUrl);
  return root.version;
}
