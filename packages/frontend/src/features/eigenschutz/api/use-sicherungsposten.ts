/**
 * TanStack-Query-Hooks für die Sicherungsposten-CRUD (Story 4.1, T6).
 *
 * Vier Endpoints (alle scoped auf `einsatzId`):
 * - `useListSicherungsposten` — GET, gefiltert nach Status (`AKTIV`/`AUFGELOEST`).
 * - `useCreateSicherungsposten` — POST, invalidiert beide Status-Listen.
 * - `useUpdateSicherungsposten` — PATCH, Optimistic-Concurrency via
 *   `expectedVersion`; 409 wird auf {@link SicherungspostenConflictError} gemappt.
 * - `useAufloeseSicherungsposten` — POST `/aufloesen`, gleicher 409-Pfad.
 *
 * Pattern entspricht den Sicherheitsregel-Hooks (`queries.ts`):
 * - `meta: { silentError: true }` → Zero-Toast-Policy (UX-DR21), Banner inline.
 * - Errors werden via `throw` durch TanStack-Query propagiert; UI liest
 *   `mutation.error` / `mutation.isError`.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/shared';
import type { CreateSicherungspostenDto, SicherungspostenDto, UpdateSicherungspostenDto, AufloeseSicherungspostenDto } from '@bluelight-hub/shared/client';
import type { SicherungspostenStatus } from '../schemas/sicherungsposten.schema';

/**
 * Query-Key-Factory für Sicherungsposten-Listen (Story 4.1).
 *
 * Hierarchie:
 * - `all` — gemeinsamer Prefix für alle Sicherungsposten-Queries.
 * - `byEinsatz(einsatzId)` — Prefix für alle Status-Listen eines Einsatzes.
 * - `list(einsatzId, status)` — Status-spezifische Liste.
 *
 * Mutationen invalidieren nur den `byEinsatz`-Prefix des betroffenen Einsatzes,
 * damit Listen anderer parallel offener Einsätze nicht unnötig refetcht werden.
 */
export const sicherungspostenQueryKeys = {
  all: ['sicherungsposten'] as const,
  byEinsatz: (einsatzId: string) => ['sicherungsposten', einsatzId] as const,
  list: (einsatzId: string, status: SicherungspostenStatus) => ['sicherungsposten', einsatzId, status] as const,
} as const;

/**
 * Zod-Guard für den 409-Response-Body-Context. Defensive `safeParse` —
 * fehlender oder malformed Context bricht den Banner-Fallback nicht.
 *
 * `attemptedVersion` und `currentVersion` sind beide `positive` — Backend-DTO
 * setzt `@Min(1)` auf `expectedVersion`, und Aggregate-Versionen starten bei 1.
 * Eine `0` würde auf einen Bypass der ValidationPipe oder einen korrupten
 * Sentinel hindeuten und gehört nicht in den Banner-Text.
 */
const SicherungspostenConflictContextSchema = z.object({
  currentVersion: z.number().int().positive().optional(),
  attemptedVersion: z.number().int().positive().optional(),
});

/**
 * Typsierter Konflikt-Error für 409-Responses des Sicherungsposten-PATCH-
 * und Auflöse-Endpoints (Story 4.1).
 *
 * Trägt `currentVersion` (sofern vom Backend mitgeliefert) und
 * `attemptedVersion` (aus dem Request-Input), damit der Inline-Banner
 * einen präzisen Text rendern kann.
 */
export class SicherungspostenConflictError extends Error {
  readonly statusCode = 409;
  constructor(
    readonly currentVersion: number | undefined,
    readonly attemptedVersion: number | undefined,
    readonly originalError: unknown,
  ) {
    super('ConflictDetected:Sicherungsposten');
    this.name = 'SicherungspostenConflictError';
  }
}

/**
 * Extrahiert aus einem beliebigen Fetch-Error einen
 * {@link SicherungspostenConflictError}, wenn der Response-Status 409 ist.
 * Andere Statuscodes liefern `null` — der Caller wirft den Original-Error
 * unverändert weiter.
 */
export function extractSicherungspostenConflictError(error: unknown, attemptedVersion: number): SicherungspostenConflictError | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status !== 409) return null;
  const dataCandidate = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const rawContext = (dataCandidate as { context?: unknown } | null)?.context;
  const contextToValidate = rawContext !== null && typeof rawContext === 'object' && !Array.isArray(rawContext) ? rawContext : {};
  const parsed = SicherungspostenConflictContextSchema.safeParse(contextToValidate);
  const currentVersion = parsed.success ? parsed.data.currentVersion : undefined;
  return new SicherungspostenConflictError(currentVersion, attemptedVersion, error);
}

function is403(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 403;
}

function sicherungspostenRetry(failureCount: number, error: unknown): boolean {
  if (is403(error)) return false;
  return failureCount < 2;
}

/**
 * Liefert die Sicherungsposten-Liste eines Einsatzes (Story 4.1, AC7+AC8).
 *
 * Status-Filter ist Pflicht; die Page rendert zwei Tabs (`AKTIV`,
 * `AUFGELOEST`), die jeweils diesen Hook konsumieren.
 *
 * **Zero-Toast** (UX-DR21): `meta: { silentError: true }` — Fehler werden
 * inline gerendert. Retry: max. 2× außer 403.
 */
export function useListSicherungsposten(einsatzId: string, status: SicherungspostenStatus, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: sicherungspostenQueryKeys.list(einsatzId, status),
    queryFn: async (): Promise<SicherungspostenDto[]> => {
      const response = await api.eigenschutz().sicherungspostenControllerListSicherungspostenVAlpha({ einsatzId, status });
      return Array.isArray(response?.data) ? (response.data as SicherungspostenDto[]) : [];
    },
    retry: sicherungspostenRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && (options?.enabled ?? true),
  });
}

/**
 * Legt einen neuen Sicherungsposten an (Story 4.1, AC8).
 *
 * Invalidiert nach Erfolg den gesamten `sicherungsposten`-Prefix —
 * trifft beide Status-Listen (AKTIV/AUFGELOEST) eines beliebigen Einsatzes.
 */
export function useCreateSicherungsposten(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<SicherungspostenDto, unknown, CreateSicherungspostenDto>({
    meta: { silentError: true },
    mutationFn: async (body): Promise<SicherungspostenDto> => {
      const response = await api.eigenschutz().sicherungspostenControllerCreateSicherungspostenVAlpha({
        einsatzId,
        createSicherungspostenDto: body,
      });
      return response.data as SicherungspostenDto;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sicherungspostenQueryKeys.byEinsatz(einsatzId) });
    },
  });
}

/**
 * Aktualisiert einen Sicherungsposten (Story 4.1, AC8).
 *
 * Optimistic-Concurrency: `body.expectedVersion` muss aus dem aktuell im
 * Cache liegenden DTO kommen. Bei 409 wirft der Hook einen typsierten
 * {@link SicherungspostenConflictError}, andere Fehler werden unverändert
 * propagiert.
 */
export function useUpdateSicherungsposten(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<SicherungspostenDto, unknown, { postenId: string; body: UpdateSicherungspostenDto }>({
    meta: { silentError: true },
    mutationFn: async ({ postenId, body }): Promise<SicherungspostenDto> => {
      try {
        const response = await api.eigenschutz().sicherungspostenControllerUpdateSicherungspostenVAlpha({
          einsatzId,
          postenId,
          updateSicherungspostenDto: body,
        });
        return response.data as SicherungspostenDto;
      } catch (error) {
        const conflict = extractSicherungspostenConflictError(error, body.expectedVersion);
        if (conflict) throw conflict;
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sicherungspostenQueryKeys.byEinsatz(einsatzId) });
    },
  });
}

/**
 * Löst einen Sicherungsposten auf (Story 4.1, AC8 + UX-DR27).
 *
 * Pflicht-Begründung 1–2000 Zeichen, gleiches Optimistic-Concurrency-Token
 * wie beim PATCH. Erfolg invalidiert beide Status-Listen — der Posten
 * wechselt von AKTIV → AUFGELOEST.
 */
export function useAufloeseSicherungsposten(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<SicherungspostenDto, unknown, { postenId: string; body: AufloeseSicherungspostenDto }>({
    meta: { silentError: true },
    mutationFn: async ({ postenId, body }): Promise<SicherungspostenDto> => {
      try {
        const response = await api.eigenschutz().sicherungspostenControllerAufloeseSicherungspostenVAlpha({
          einsatzId,
          postenId,
          aufloeseSicherungspostenDto: body,
        });
        return response.data as SicherungspostenDto;
      } catch (error) {
        const conflict = extractSicherungspostenConflictError(error, body.expectedVersion);
        if (conflict) throw conflict;
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sicherungspostenQueryKeys.byEinsatz(einsatzId) });
    },
  });
}
