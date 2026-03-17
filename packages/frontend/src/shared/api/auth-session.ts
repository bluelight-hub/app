import { createServerScopedAuthApi } from '@/shared/api/server-scoped-clients';
import type { QueryFunctionContext } from '@tanstack/react-query';
import { z } from 'zod';
import { fetchWithRefresh } from './fetchWithRefresh';
import { parseJsonResponse } from './json-response';

const authUserSchema = z
  .object({
    id: z.string(),
    username: z.string(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    lastLoginAt: z.string().optional(),
    createdAt: z.string().optional(),
    updatedAt: z.string().optional(),
  })
  .passthrough();

export const authCheckResponseSchema = z
  .object({
    user: authUserSchema.nullish(),
    authenticated: z.boolean(),
    isAdminAuthenticated: z.boolean().optional(),
  })
  .passthrough();

export const adminStatusResponseSchema = z
  .object({
    adminSetupAvailable: z.boolean().optional(),
  })
  .passthrough();

export type AuthCheckResponse = z.infer<typeof authCheckResponseSchema>;
export type AdminStatusResponse = z.infer<typeof adminStatusResponseSchema>;

function getServerScope(queryKey: QueryFunctionContext<readonly unknown[]>['queryKey']): string {
  const serverScope = queryKey.at(-1);

  if (typeof serverScope !== 'string' || serverScope === 'unconfigured') {
    throw new Error('Auth-Session-Query benötigt einen gültigen Server-Scope.');
  }

  return serverScope;
}

/**
 * Zentraler Raw-Adapter für `auth/check`.
 *
 * Der Backend-Endpoint nutzt `@SkipTransform`, deshalb bleibt das Parsen
 * bewusst in `shared/api` gekapselt statt in Feature-Hooks verteilt.
 */
export async function fetchAuthCheck({ queryKey }: QueryFunctionContext<readonly unknown[]>): Promise<AuthCheckResponse> {
  const response = await createServerScopedAuthApi(getServerScope(queryKey), {
    fetchApi: fetchWithRefresh,
  }).authControllerCheckAuthRaw();
  return parseJsonResponse(response.raw, authCheckResponseSchema, 'auth/check');
}

/**
 * Zentraler Raw-Adapter für `auth/admin/status`.
 */
export async function fetchAdminStatus({ queryKey }: QueryFunctionContext<readonly unknown[]>): Promise<AdminStatusResponse> {
  const response = await createServerScopedAuthApi(getServerScope(queryKey), {
    fetchApi: fetchWithRefresh,
  }).authControllerGetAdminStatusRaw();
  return parseJsonResponse(response.raw, adminStatusResponseSchema, 'auth/admin/status');
}
