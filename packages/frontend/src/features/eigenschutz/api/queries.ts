import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { api } from '@/shared';
import type {
  CreateGefaehrdungsbeurteilungInput,
  Gefaehrdungsbeurteilung,
  GefaehrdungsbeurteilungHistorie,
  GefaehrdungsbeurteilungVorlage,
  UpdateGefaehrdungsbeurteilungItemsInput,
} from '../schemas/gefaehrdungsbeurteilung.schema';
import type { CreateSicherheitsregelInput, SicherheitsregelDto, UpdateSicherheitsregelInput } from '../schemas/sicherheitsregel.schema';

/**
 * Zod-Guard für den 409-Response-Body-Context (Story 2.3, AC13).
 *
 * Wir konsumieren nur die Felder, die wir dem Banner zeigen; fehlende oder
 * malformed Felder (z. B. `currentVersion: "five"` aus einem älteren
 * Backend-Stand oder einem Proxy-Rewrite) führen zum Fallback-Text und
 * werfen KEINEN Runtime-Fehler. `.safeParse()` bleibt immer non-throwing.
 *
 * `currentVersion` ist explizit optional: im Reload-Failure-Pfad (Handler
 * konnte nach dem DB-Level-Conflict die aktuelle Version nicht re-lesen)
 * liefert das Backend legitim nur `attemptedVersion`. Wir wollen die valide
 * `attemptedVersion` NICHT verlieren, nur weil das komplette Objekt als
 * „invalid" abgewiesen würde.
 */
const GefaehrdungsbeurteilungConflictContextSchema = z.object({
  currentVersion: z.number().int().positive().optional(),
  attemptedVersion: z.number().int().nonnegative().optional(),
});

/**
 * Dünne Error-Subclass für den 409-Konflikt bei
 * `useUpdateGefaehrdungsbeurteilungItems` (Story 2.3, AC13).
 *
 * Trägt `currentVersion` (kann `undefined` sein bei älterem Backend ohne
 * Context-Enrichment) und `attemptedVersion` (aus dem Request-Input), damit
 * das UI einen präziseren Banner-Text rendern kann. Der ursprüngliche
 * Fetch-Error bleibt unter `originalError` erhalten, falls Debugging im
 * Sentry- oder Konsolen-Kontext nötig wird.
 */
export class GefaehrdungsbeurteilungConflictError extends Error {
  readonly statusCode = 409;
  constructor(
    readonly currentVersion: number | undefined,
    readonly attemptedVersion: number | undefined,
    readonly originalError: unknown,
  ) {
    super('ConflictDetected:Gefaehrdungsbeurteilung');
    this.name = 'GefaehrdungsbeurteilungConflictError';
  }
}

/**
 * Extrahiert aus einem beliebigen Fetch-Error einen
 * `GefaehrdungsbeurteilungConflictError`, wenn der Response-Status 409 ist.
 * Andere Statuscodes (z. B. 422, 500) liefern `null` — dann soll der
 * aufrufende Hook den Original-Error unverändert weiterwerfen.
 *
 * Der Context wird per Zod validiert; bei fehlendem/malformed Context
 * fällt `currentVersion` auf `undefined` zurück (Banner nutzt dann den
 * generischen Fallback-Text).
 */
export function extractConflictError(error: unknown, attemptedVersion: number): GefaehrdungsbeurteilungConflictError | null {
  const status = (error as { response?: { status?: number } } | null)?.response?.status;
  if (status !== 409) return null;
  const dataCandidate = (error as { response?: { data?: unknown } } | null)?.response?.data;
  const rawContext = (dataCandidate as { context?: unknown } | null)?.context;
  // Graceful Handling von non-Objekt-Kontext (String, Array, null, undefined):
  // safeParse würde das gesamte Objekt verwerfen; wir wollen die valide
  // `attemptedVersion` aus dem Request-Input trotzdem bewahren.
  const contextToValidate = rawContext !== null && typeof rawContext === 'object' && !Array.isArray(rawContext) ? rawContext : {};
  const parsed = GefaehrdungsbeurteilungConflictContextSchema.safeParse(contextToValidate);
  const currentVersion = parsed.success ? parsed.data.currentVersion : undefined;
  return new GefaehrdungsbeurteilungConflictError(currentVersion, attemptedVersion, error);
}

/**
 * Query-Key-Factory für das Eigenschutz-Feature (Story 1.6 + 2.1).
 *
 * Hierarchische Struktur gemäß Architecture §I — ermöglicht
 * gezielte Cache-Invalidierung in späteren Stories (z. B. nach
 * PSA-Profil-Update `invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.all(einsatzId) })`).
 */
export const EIGENSCHUTZ_QUERY_KEYS = {
  all: (einsatzId: string) => ['eigenschutz', einsatzId] as const,
  health: (einsatzId: string) => ['eigenschutz', einsatzId, 'health'] as const,
  gefaehrdungsbeurteilungsVorlagen: (einsatzId: string) => ['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungs-vorlagen'] as const,
  gefaehrdungsbeurteilungen: (einsatzId: string) => ['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungen'] as const,
  gefaehrdungsbeurteilung: (einsatzId: string, id: string) => ['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungen', id] as const,
  gefaehrdungsbeurteilungHistorie: (einsatzId: string, id: string) => ['eigenschutz', einsatzId, 'gefaehrdungsbeurteilungen', id, 'historie'] as const,
  /**
   * Listen-Scope der Sicherheitsregeln (Story 2.6, Task 7.2).
   *
   * Der optionale `einheitId`-Filter landet als strukturiertes Segment im Key,
   * damit einsatzweite Listen (`einheitId = undefined`) und einheiten-
   * spezifische Listen (`einheitId = <cuid>`) im Cache getrennt geführt
   * werden. Gemeinsames Prefix bleibt `[..., 'sicherheitsregeln', 'list']`,
   * sodass `invalidateQueries({ queryKey: sicherheitsregeln(einsatzId) })`
   * beide Varianten auf einen Schlag invalidiert.
   */
  sicherheitsregeln: (einsatzId: string, einheitId?: string) =>
    einheitId === undefined ? (['eigenschutz', einsatzId, 'sicherheitsregeln', 'list'] as const) : (['eigenschutz', einsatzId, 'sicherheitsregeln', 'list', { einheitId }] as const),
  sicherheitsregel: (einsatzId: string, id: string) => ['eigenschutz', einsatzId, 'sicherheitsregeln', 'detail', id] as const,
  /**
   * Quittungs-Liste pro Sicherheitsregel (Story 2.7 AC10) — Sender-View.
   * Granularität pro Regel-ID, damit `useAckSicherheitsregel.onSuccess`
   * gezielt invalidieren kann.
   */
  sicherheitsregelQuittungen: (einsatzId: string, regelId: string) => ['eigenschutz', einsatzId, 'sicherheitsregeln', 'quittungen', regelId] as const,
} as const;

/**
 * Prüft robust, ob ein unbekannter Error einen HTTP-403-Status trägt.
 * Kompatibel mit `ResponseError` aus dem generierten Client (`error.response.status`).
 */
function is403(error: unknown): boolean {
  return (error as { response?: { status?: number } } | null)?.response?.status === 403;
}

/**
 * Gemeinsame Retry-Policy für Eigenschutz-GET-Queries (AC8, Zero-Toast).
 * - 403 → kein Retry (Einsatz-Zugriff wurde serverseitig abgelehnt).
 * - Sonst → maximal 2 Wiederholungen.
 */
function eigenschutzRetry(failureCount: number, error: unknown): boolean {
  if (is403(error)) {
    return false;
  }
  return failureCount < 2;
}

/**
 * Liefert den Health-Status des Eigenschutz-Moduls für einen Einsatz.
 *
 * **Konsumiert den Story-1.6-AC2-Endpoint** und ist derzeit reiner Smoke-
 * Test: Rückgabe `{ status: 'ready' }` bedeutet, dass der Bereich gemountet
 * ist und der Einsatz-Scope serverseitig durchläuft. Epic 2+ ersetzt den
 * Hook-Konsum durch fachliche Queries.
 *
 * **403-Verhalten (AC8, Zero-Toast-Policy):**
 * - Kein Retry — 403 ist kein transientes Problem.
 * - `meta: { silentError: true }` — unterdrückt den globalen Sonner-Toast;
 *   die Route-Komponente rendert stattdessen einen `EmptyState`.
 */
export function useEigenschutzHealth(einsatzId: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.health(einsatzId),
    queryFn: async () => {
      const response = await api.eigenschutz().eigenschutzHealthControllerGetHealthVAlpha({ einsatzId });
      return response.data;
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId),
  });
}

/**
 * Liefert die aktiven Gefährdungsbeurteilungs-Seed-Vorlagen für den
 * aktuellen Einsatz (Story 2.1, AC4).
 *
 * Die Drawer-Komponente nutzt den Hook, um die Szenario-Kacheln
 * (Verkehrsunfall, MANV, PSNV, Einsatzende) mit aktivem Content zu befüllen.
 *
 * **UX-DR21 Zero-Toast-Policy:**
 * - `meta: { silentError: true }` — Fehler werden inline im Drawer gerendert,
 *   nicht über den globalen Sonner-Toast.
 * - Retry-Policy identisch zu `useEigenschutzHealth` (403 → kein Retry).
 */
export function useGefaehrdungsbeurteilungVorlagen(einsatzId: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungsVorlagen(einsatzId),
    queryFn: async (): Promise<GefaehrdungsbeurteilungVorlage[]> => {
      const response = await api.eigenschutz().gefaehrdungsbeurteilungControllerListVorlagenVAlpha({ einsatzId });
      // Defensive gegen Backend-Responseshape-Drift: ein nicht-Array-Payload
      // würde im Drawer einen Laufzeit-Typfehler („map is not a function") auslösen.
      return Array.isArray(response?.data) ? (response.data as GefaehrdungsbeurteilungVorlage[]) : [];
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId),
  });
}

/**
 * Liefert alle Gefährdungsbeurteilungen des aktuellen Einsatzes, zuletzt
 * geänderte zuerst. Die Listen-Page nutzt diesen Hook als echte Datenquelle
 * für den Überblick; der Create-Hook invalidiert denselben Query-Key.
 */
export function useGefaehrdungsbeurteilungen(einsatzId: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen(einsatzId),
    queryFn: async (): Promise<Gefaehrdungsbeurteilung[]> => {
      const response = await api.eigenschutz().gefaehrdungsbeurteilungControllerListBeurteilungenVAlpha({
        einsatzId,
      });
      return Array.isArray(response?.data) ? (response.data as Gefaehrdungsbeurteilung[]) : [];
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId),
  });
}

/**
 * Legt eine Gefährdungsbeurteilung für eine Einheit im aktuellen Einsatz
 * an (Story 2.1, AC5).
 *
 * **Optimistic-Cache-Pattern:**
 * - `onMutate` snapshotet den aktuellen Listen-Cache unter
 *   `EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen(einsatzId)`.
 * - `onError` stellt den Snapshot wieder her.
 * - `onSettled` invalidiert die Liste, damit der echte Server-State nachgeladen
 *   wird (Source-of-Truth bleibt das Backend).
 *
 * Der Hook führt **keinen** Redirect durch — das macht die Drawer-Komponente
 * über den `onSuccess`-Callback mit dem zurückgegebenen Beurteilungs-Objekt.
 */
export function useCreateGefaehrdungsbeurteilung(einsatzId: string) {
  const queryClient = useQueryClient();
  const listKey = EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungen(einsatzId);

  return useMutation({
    mutationFn: async (input: CreateGefaehrdungsbeurteilungInput): Promise<Gefaehrdungsbeurteilung> => {
      const response = await api.eigenschutz().gefaehrdungsbeurteilungControllerCreateBeurteilungVAlpha({
        einsatzId,
        createGefaehrdungsbeurteilungDto: {
          einheitId: input.einheitId,
          // null → undefined: Der generierte Client kennt nur optionale String-Felder,
          // aber das Shared-Zod-Schema erlaubt `null` als explizites „nicht gesetzt".
          vorlageId: input.vorlageId ?? undefined,
          gefahrenzoneId: input.gefahrenzoneId ?? undefined,
        },
      });
      return response.data as Gefaehrdungsbeurteilung;
    },
    onMutate: async () => {
      // Laufende Listen-Queries abbrechen, damit sie den Snapshot nicht überschreiben.
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Gefaehrdungsbeurteilung[]>(listKey);
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
}

/**
 * Liefert eine einzelne Gefährdungsbeurteilung inkl. `items` + `version`
 * (Story 2.2, AC10). Der Query-Key ist granular pro Beurteilungs-ID, damit
 * die Mutation gezielt invalidieren kann.
 *
 * Retry- und Silent-Error-Policy identisch zum Vorlagen-Hook.
 */
export async function fetchGefaehrdungsbeurteilung(einsatzId: string, id: string): Promise<Gefaehrdungsbeurteilung> {
  const response = await api.eigenschutz().gefaehrdungsbeurteilungControllerGetBeurteilungVAlpha({
    einsatzId,
    id,
  });
  return response.data as Gefaehrdungsbeurteilung;
}

export function useGefaehrdungsbeurteilung(einsatzId: string, id: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, id),
    queryFn: () => fetchGefaehrdungsbeurteilung(einsatzId, id),
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && Boolean(id),
  });
}

/**
 * Liefert die chronologische Versionshistorie einer Gefährdungsbeurteilung
 * (Story 2.4, AC10).
 *
 * Konsumiert den Read-Only-Endpoint `GET …/gefaehrdungsbeurteilungen/:id/versionen`
 * und liefert `{ aggregateVersion, eintraege[] }` absteigend sortiert (neueste
 * Version zuerst). Backend löst `changedByUserName` pro Eintrag auf; bei
 * soft-deleted User bleibt der Wert `null` — das UI fällt dann auf die
 * UserId-Kurzform zurück.
 *
 * **Cache-Verhalten:**
 * - `staleTime: 5_000` — nach einem Schreib-Vorgang (Story 2.2/2.3) wird die
 *   Historie nicht proaktiv invalidiert; TanStack refetched beim nächsten
 *   Popover-Open nach Ablauf der Stale-Time (begründet in AC10).
 * - `retry: eigenschutzRetry` — 403 → kein Retry, sonst max. 2 Wiederholungen.
 * - `meta: { silentError: true }` — Popover rendert Fehler inline (Zero-Toast).
 */
export function useGefaehrdungsbeurteilungHistorie(einsatzId: string, id: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie(einsatzId, id),
    queryFn: async (): Promise<GefaehrdungsbeurteilungHistorie> => {
      const response = await api.eigenschutz().gefaehrdungsbeurteilungControllerGetHistorieVAlpha({
        einsatzId,
        id,
      });
      return response.data as GefaehrdungsbeurteilungHistorie;
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && Boolean(id),
    staleTime: 5_000,
    refetchOnMount: 'always',
  });
}

/**
 * Aktualisiert die Items einer Gefährdungsbeurteilung (Story 2.2, AC10).
 *
 * **Optimistic-Update-Pattern:**
 * - `onMutate`: snapshot den aktuellen Detail-Cache + setze den Cache auf
 *   eine optimistische Version (`version + 1`). Das UI rendert die neue
 *   Liste sofort; der Banner erscheint erst bei 409.
 * - `onError`: rollback auf Snapshot. 409 (ConflictDetected) wird NICHT
 *   silent — die Page-Komponente fängt den Error über `mutation.error` ab
 *   und rendert einen `SeverityBanner` (Zero-Toast-Policy UX-DR21).
 * - `onSettled`: invalidate, damit die Source-of-Truth das Backend bleibt.
 */
export function useUpdateGefaehrdungsbeurteilungItems(einsatzId: string, id: string) {
  const queryClient = useQueryClient();
  const detailKey = EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilung(einsatzId, id);
  const historieKey = EIGENSCHUTZ_QUERY_KEYS.gefaehrdungsbeurteilungHistorie(einsatzId, id);

  return useMutation<Gefaehrdungsbeurteilung, unknown, UpdateGefaehrdungsbeurteilungItemsInput, { previous: Gefaehrdungsbeurteilung | undefined }>({
    // UX-DR21 Zero-Toast-Policy: 409-Konflikte rendert die Page-Komponente als
    // `SeverityBanner`-Fallback (div role="alert"). Ein zusätzlicher
    // Sonner-Toast würde zu Doppel-Benachrichtigung führen.
    meta: { silentError: true },
    scope: {
      id: `eigenschutz-gefaehrdungsbeurteilung-items-${einsatzId}-${id}`,
    },
    mutationFn: async (input): Promise<Gefaehrdungsbeurteilung> => {
      try {
        const response = await api.eigenschutz().gefaehrdungsbeurteilungControllerUpdateItemsVAlpha({
          einsatzId,
          id,
          updateGefaehrdungsbeurteilungItemsDto: {
            items: input.items.map((item) => ({
              id: item.id ?? undefined,
              title: item.title,
              description: item.description ?? undefined,
              eintritt: item.eintritt,
              schaden: item.schaden,
              // risikoklasse wird vom Backend autoritativ berechnet — kein Client-Feld.
              schutzmassnahmen: item.schutzmassnahmen ?? undefined,
            })),
            expectedVersion: input.expectedVersion,
          },
        });
        return response.data as Gefaehrdungsbeurteilung;
      } catch (error) {
        // AC13: 409 → typsierter Error mit currentVersion-Hinweis.
        // Andere Fehler (422, 500, Network) werden unverändert durchgereicht.
        const conflict = extractConflictError(error, input.expectedVersion);
        if (conflict) throw conflict;
        throw error;
      }
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: detailKey });
      const previous = queryClient.getQueryData<Gefaehrdungsbeurteilung>(detailKey);
      if (previous) {
        queryClient.setQueryData<Gefaehrdungsbeurteilung>(detailKey, {
          ...previous,
          // Optimistic: Items wie eingegeben (ohne risikoklasse — Backend entscheidet).
          items: input.items,
          version: input.expectedVersion + 1,
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      // Rollback auch bei `previous === null` durchführen (Cache war vorher
      // leer): ein truthy-Check würde den optimistisch gesetzten Wert stehen
      // lassen, obwohl der Cache eigentlich leer sein sollte.
      if (context !== undefined && 'previous' in context) {
        queryClient.setQueryData(detailKey, context.previous);
      }
    },
    onSuccess: (data) => {
      // Erfolg: Server-Wahrheit übernehmen (inkl. server-berechneter risikoklasse).
      queryClient.setQueryData(detailKey, data);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: historieKey });
    },
  });
}

/**
 * Zod-Guard für den 409-Response-Body-Context einer Sicherheitsregel-Mutation
 * (Story 2.6, AC3).
 *
 * Analog zu `GefaehrdungsbeurteilungConflictContextSchema` — der Hook zeigt
 * currentVersion + attemptedVersion im Banner; fehlende oder malformte Felder
 * führen zum Fallback-Text und werfen KEINEN Runtime-Fehler.
 */
const SicherheitsregelConflictContextSchema = z.object({
  currentVersion: z.number().int().positive().optional(),
  attemptedVersion: z.number().int().nonnegative().optional(),
});

/**
 * Dünne Error-Subclass für den 409-Konflikt bei `useUpdateSicherheitsregel`
 * (Story 2.6, AC3 — Optimistic-Concurrency).
 *
 * Trägt `currentVersion` (kann `undefined` sein bei Backend ohne Context-
 * Enrichment) und `attemptedVersion` (aus dem Request-Input), damit das UI
 * einen präziseren Banner-Text rendern kann. Der ursprüngliche Fetch-Error
 * bleibt unter `originalError` erhalten.
 */
export class SicherheitsregelConflictError extends Error {
  readonly statusCode = 409;
  constructor(
    readonly currentVersion: number | undefined,
    readonly attemptedVersion: number | undefined,
    readonly originalError: unknown,
  ) {
    super('ConflictDetected:Sicherheitsregel');
    this.name = 'SicherheitsregelConflictError';
  }
}

/**
 * Extrahiert aus einem Fetch-Error einen `SicherheitsregelConflictError`,
 * wenn der Response-Status 409 ist. Andere Statuscodes liefern `null` — dann
 * soll der aufrufende Hook den Original-Error unverändert weiterwerfen.
 *
 * Robust gegen non-Objekt-Errors (String, Number, null, Array): statt
 * `as { response?: ... }` zu casten (was bei Primitives wirft, sobald
 * `.response` zugegriffen wird) prüfen wir typeof === 'object' explizit.
 *
 * Bevorzugt **Server-`attemptedVersion`** aus dem 409-Body-Context, fällt
 * nur bei fehlendem Server-Wert auf das Frontend-Argument zurück — sonst
 * würde ein zukünftiger Server-side Coerce des Wertes nie sichtbar werden.
 */
export function extractSicherheitsregelConflictError(error: unknown, attemptedVersion: number): SicherheitsregelConflictError | null {
  if (error === null || error === undefined || typeof error !== 'object') return null;
  const errObj = error as { response?: unknown };
  const response = typeof errObj.response === 'object' && errObj.response !== null ? (errObj.response as { status?: unknown; data?: unknown }) : undefined;
  const status = typeof response?.status === 'number' ? response.status : undefined;
  if (status !== 409) return null;

  const dataCandidate = response?.data;
  const rawContext = typeof dataCandidate === 'object' && dataCandidate !== null && !Array.isArray(dataCandidate) ? (dataCandidate as { context?: unknown }).context : undefined;
  const contextToValidate = typeof rawContext === 'object' && rawContext !== null && !Array.isArray(rawContext) ? rawContext : {};
  const parsed = SicherheitsregelConflictContextSchema.safeParse(contextToValidate);
  const currentVersion = parsed.success ? parsed.data.currentVersion : undefined;
  const serverAttemptedVersion = parsed.success ? parsed.data.attemptedVersion : undefined;
  return new SicherheitsregelConflictError(currentVersion, serverAttemptedVersion ?? attemptedVersion, error);
}

/**
 * Transformiert die diskriminierte Union aus dem Shared-Schema auf das flache
 * Request-DTO-Shape, das der generierte Client erwartet
 * (`{titel, inhalt, einsatzweit, einheitIds?}`).
 *
 * Bei `einsatzweit === true` bleibt `einheitIds` **absent**
 * (`undefined`), weil der Backend-Controller dann ohnehin `einheitId = null`
 * erzwingt; ein leeres Array würde den Payload unnötig aufblähen. Bei
 * `einsatzweit === false` wird das TypeScript-diskriminiert garantiert
 * nicht-leere Array durchgereicht.
 */
function toCreateSicherheitsregelDto(input: CreateSicherheitsregelInput): { titel: string; inhalt: string; einsatzweit: boolean; einheitIds?: string[] } {
  if (input.einsatzweit) {
    return { titel: input.titel, inhalt: input.inhalt, einsatzweit: true };
  }
  return { titel: input.titel, inhalt: input.inhalt, einsatzweit: false, einheitIds: input.einheitIds };
}

/**
 * Identisch zu {@link toCreateSicherheitsregelDto}, ergänzt `expectedVersion`
 * für Optimistic-Concurrency (Story 2.6, AC3).
 */
function toUpdateSicherheitsregelDto(input: UpdateSicherheitsregelInput): { titel: string; inhalt: string; einsatzweit: boolean; einheitIds?: string[]; expectedVersion: number } {
  if (input.einsatzweit) {
    return { titel: input.titel, inhalt: input.inhalt, einsatzweit: true, expectedVersion: input.expectedVersion };
  }
  return { titel: input.titel, inhalt: input.inhalt, einsatzweit: false, einheitIds: input.einheitIds, expectedVersion: input.expectedVersion };
}

/**
 * Liefert die aktiven Sicherheitsregeln des aktuellen Einsatzes (Story 2.6,
 * AC6). Der optionale `einheitId`-Parameter lässt das Backend einsatzweite
 * Regeln **plus** Regeln dieser konkreten Einheit liefern — für Story 2.7
 * (Abschnittsleiter-Sicht) vorbereitet, schadet im Sender-Flow aber nicht.
 *
 * **UX-DR21 Zero-Toast-Policy:** `meta: { silentError: true }` — Fehler werden
 * inline auf der Page gerendert. Retry-Policy identisch zum Vorlagen-Hook
 * (403 → kein Retry).
 */
export function useSicherheitsregeln(einsatzId: string, einheitId?: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln(einsatzId, einheitId),
    queryFn: async (): Promise<SicherheitsregelDto[]> => {
      const response = await api.eigenschutz().sicherheitsregelControllerListRegelnVAlpha({ einsatzId, einheitId });
      // Defensive gegen Envelope-Drift: non-Array-Payload würde in Tabellen zu
      // „map is not a function" führen.
      return Array.isArray(response?.data) ? (response.data as SicherheitsregelDto[]) : [];
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId),
  });
}

/**
 * Lädt eine einzelne Sicherheitsregel für den Edit-Modus des Drawers
 * (Story 2.6, AC1 + Code-Review-Patch #17). Der Query-Key ist granular pro
 * Regel-ID, damit `useUpdateSicherheitsregel` gezielt invalidieren kann.
 *
 * **Frische-Strategie**: `staleTime: 0` + `refetchOnMount: 'always'` —
 * sobald der Drawer einen Edit-Open auslöst, wird die Regel server-seitig
 * neu geladen, damit der User keinen stale Stand aus der Listen-Cache
 * sieht. Der Caller (Drawer) steuert das Mounten über `options.enabled =
 * open && isEditMode`, sodass die Query nur zur tatsächlichen Bearbeitung
 * aktiv wird.
 */
export function useSicherheitsregel(einsatzId: string, id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregel(einsatzId, id),
    queryFn: async (): Promise<SicherheitsregelDto> => {
      const response = await api.eigenschutz().sicherheitsregelControllerGetRegelVAlpha({ einsatzId, id });
      return response.data as SicherheitsregelDto;
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && Boolean(id) && (options?.enabled ?? true),
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

/**
 * Legt eine Sicherheitsregel an (Story 2.6, AC2).
 *
 * **Fanout-Response:** Der Backend-Controller liefert ein Array von DTOs —
 * eine Row pro Zuordnungs-Einheit bzw. eine einzelne Row bei einsatzweiter
 * Regel. Seit dem Code-Review-Patch trägt der `@ApiWrappedCreatedResponse`-
 * Decorator `isArray: true`, der OpenAPI-Generator typisiert `data`
 * korrekt als Array — der frühere `as unknown as`-Doppel-Cast ist nicht
 * mehr nötig.
 *
 * Nach Erfolg wird **alle** `sicherheitsregeln`-Listen-Keys
 * (einsatzweit + einheiten-scoped) invalidiert — das Prefix
 * `[..., 'sicherheitsregeln', 'list']` stimmt für beide Varianten und
 * TanStack macht exact-or-prefix-Matching im `invalidateQueries`-Default.
 */
export function useCreateSicherheitsregel(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSicherheitsregelInput): Promise<SicherheitsregelDto[]> => {
      const response = await api.eigenschutz().sicherheitsregelControllerCreateRegelnVAlpha({
        einsatzId,
        createSicherheitsregelDto: toCreateSicherheitsregelDto(input),
      });
      return (response.data ?? []) as SicherheitsregelDto[];
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln(einsatzId),
      });
    },
  });
}

/**
 * Aktualisiert eine Sicherheitsregel (Story 2.6, AC3 + AC4).
 *
 * Liefert genauso wie `useCreateSicherheitsregel` ein `SicherheitsregelDto[]`
 * — bei In-Place-Update ein Einzel-Element-Array, bei Re-Wire die neu
 * erzeugten Rows (alle mit stabiler `propagationGroupId`).
 *
 * **409-Handling (Zero-Toast, UX-DR21):** Der Hook mappt Fetch-Errors mit
 * Status 409 auf einen typsierten `SicherheitsregelConflictError` (trägt
 * `currentVersion` + `attemptedVersion`). Andere Fehler (422, 500, Network)
 * werden unverändert durchgereicht; die Page rendert beide Fälle inline,
 * kein Sonner-Toast.
 *
 * **Invalidation:** sowohl die Listen-Query als auch die Detail-Query werden
 * invalidiert — Detail, damit ein weiterer Edit-Open den Server-State
 * (inkl. neuer `version`) sieht; Liste, damit die Page-Tabelle aktuell ist.
 */
export function useUpdateSicherheitsregel(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<SicherheitsregelDto[], unknown, UpdateSicherheitsregelInput & { id: string }>({
    meta: { silentError: true },
    mutationFn: async (input): Promise<SicherheitsregelDto[]> => {
      try {
        const response = await api.eigenschutz().sicherheitsregelControllerUpdateRegelVAlpha({
          einsatzId,
          id: input.id,
          updateSicherheitsregelDto: toUpdateSicherheitsregelDto(input),
        });
        return (response.data ?? []) as SicherheitsregelDto[];
      } catch (error) {
        const conflict = extractSicherheitsregelConflictError(error, input.expectedVersion);
        if (conflict) throw conflict;
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln(einsatzId),
      });
      void queryClient.invalidateQueries({
        queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregel(einsatzId, variables.id),
      });
    },
  });
}

/**
 * Input-Shape für `useAckSicherheitsregel`.
 */
export interface AckSicherheitsregelInput {
  id: string;
  einheitId: string;
  expectedRegelVersion?: number;
}

/**
 * Quittiert eine Sicherheitsregel durch eine konkrete Einheit (Story 2.7 AC2).
 *
 * **Idempotenz** (AC3): Doppelte Sends ergeben 204; kein Server-Toast, kein
 * Frontend-Sonner — der Banner verschwindet stumm.
 *
 * **Cache-Invalidation** (AC11/AC13):
 * - `sicherheitsregeln(einsatzId)` — Listen-Refresh, damit der eigene
 *   Quittungs-Status auf der Page aktuell ist.
 * - `sicherheitsregel(einsatzId, id)` — Detail-Refresh.
 * - `sicherheitsregelQuittungen(einsatzId, id)` — Sender-Counter aktualisieren.
 *
 * **Zero-Toast** (UX-DR21): Bei Mutation-Fehler (422/500/Network) wird der
 * Error unverändert weitergeworfen. Banner-Komponente rendert Inline-Error
 * (kein Sonner-Toast).
 */
export function useAckSicherheitsregel(einsatzId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, unknown, AckSicherheitsregelInput>({
    meta: { silentError: true },
    mutationFn: async (input) => {
      try {
        await api.eigenschutz().sicherheitsregelControllerQuittierenVAlpha({
          einsatzId,
          id: input.id,
          ackSicherheitsregelDto: {
            einheitId: input.einheitId,
            expectedRegelVersion: input.expectedRegelVersion,
          },
        });
      } catch (error) {
        // Story 2.7 Code-Review-Patch: 409 (Optimistic-Concurrency-Mismatch
        // bei `expectedRegelVersion`) auf einen typisierten
        // `SicherheitsregelConflictError` mit `currentVersion`/
        // `attemptedVersion`-Kontext anreichern, sodass UI-Komponenten den
        // Banner mit präzisen Versions-Daten neu prompten können. Andere
        // Statuscodes (422, 500, Network) werden 1:1 weitergeworfen.
        if (input.expectedRegelVersion !== undefined) {
          const conflict = extractSicherheitsregelConflictError(error, input.expectedRegelVersion);
          if (conflict !== null) {
            throw conflict;
          }
        }
        throw error;
      }
    },
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregeln(einsatzId) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregel(einsatzId, variables.id) });
      void queryClient.invalidateQueries({ queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregelQuittungen(einsatzId, variables.id) });
    },
  });
}

/**
 * Element-Shape für die Quittungs-Liste (Sender-View, Story 2.7 AC10).
 *
 * Spiegelt das Backend-DTO 1:1; `quittiertVonUserName` ist Phase-2-Enrichment.
 */
export interface SicherheitsregelQuittungEntry {
  einheitId: string;
  einheitName: string;
  quittiertAm: string;
  quittiertVonUserId: string;
  quittiertVonUserName?: string;
}

/**
 * Listet alle Quittungen einer Sicherheitsregel — Sender-View
 * (Story 2.7 AC10/AC13). Wird vom Stab-Dashboard und vom
 * `AcknowledgmentStatusBadge`-Popover konsumiert.
 */
export function useSicherheitsregelQuittungen(einsatzId: string, regelId: string) {
  return useQuery({
    queryKey: EIGENSCHUTZ_QUERY_KEYS.sicherheitsregelQuittungen(einsatzId, regelId),
    queryFn: async (): Promise<SicherheitsregelQuittungEntry[]> => {
      const response = await api.eigenschutz().sicherheitsregelControllerListQuittungenVAlpha({ einsatzId, id: regelId });
      // `@ApiWrappedResponse(... { isArray: true })` (Story 2.6 Wrapper-
      // Decorator) erzeugt einen typisierten `data: Array<…>` — kein
      // defensiver Cast mehr nötig (Story 2.7 Code-Review-Decision 4).
      const rows = response?.data ?? [];
      return rows.map((row) => ({
        einheitId: row.einheitId,
        einheitName: row.einheitName,
        quittiertAm: row.quittiertAm,
        quittiertVonUserId: row.quittiertVonUserId,
        quittiertVonUserName: row.quittiertVonUserName,
      }));
    },
    retry: eigenschutzRetry,
    meta: { silentError: true },
    enabled: Boolean(einsatzId) && Boolean(regelId),
  });
}
