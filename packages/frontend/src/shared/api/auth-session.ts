import { api } from '@/shared/api/api';
import { z } from 'zod';
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

/**
 * Zentraler Raw-Adapter für `auth/check`.
 *
 * Der Backend-Endpoint nutzt `@SkipTransform`, deshalb bleibt das Parsen
 * bewusst in `shared/api` gekapselt statt in Feature-Hooks verteilt.
 */
export async function fetchAuthCheck(): Promise<AuthCheckResponse> {
  const response = await api.auth().authControllerCheckAuthRaw();
  return parseJsonResponse(response.raw, authCheckResponseSchema, 'auth/check');
}

/**
 * Zentraler Raw-Adapter für `auth/admin/status`.
 */
export async function fetchAdminStatus(): Promise<AdminStatusResponse> {
  const response = await api.auth().authControllerGetAdminStatusRaw();
  return parseJsonResponse(response.raw, adminStatusResponseSchema, 'auth/admin/status');
}
