import type { SyncConflictEntityType } from '@domain/eigenschutz/events/konflikt-erkannt.event';

/**
 * Query-DTO `ListSyncConflictsQuery` (Story 3.10 AC3).
 *
 * Listet die offenen `sync_conflicts`-Rows eines Einsatzes — gefiltert
 * serverseitig auf `resolvedAt IS NULL`. Die Ergebnis-Items haben **kein**
 * `einsatzId`-Feld, weil der Endpoint bereits einsatz-scoped ist.
 *
 * Caller-Membership wird im Handler geprüft (`UnzulaessigeEinheitenZuordnung`
 * bei Nicht-Teilnehmer — NFR-S2 + UX-DR21 Zero-Toast bei 403).
 */
export class ListSyncConflictsQuery {
  constructor(
    public readonly einsatzId: string,
    public readonly callerUserId: string,
    public readonly filter?: {
      entityType?: SyncConflictEntityType;
      einheitId?: string;
    },
  ) {}
}

export type ListSyncConflictsResult = {
  readonly conflicts: readonly SyncConflictListItem[];
};

/**
 * Item-Form der List-Antwort (Story 3.10 AC3).
 *
 * Bewusst ohne `einsatzId` (Endpoint scope) und ohne `resolvedAt /
 * resolvedByUserId / resolution` (sind in der Liste IMMER `null`, weil
 * serverseitig auf offene Konflikte gefiltert wird).
 */
export type SyncConflictListItem = {
  readonly id: string;
  readonly einheitId: string | null;
  readonly entityType: SyncConflictEntityType;
  readonly entityId: string;
  readonly fieldPath: string;
  readonly localPayload: Record<string, unknown>;
  readonly serverVersion: number;
  readonly localExpectedVersion: number;
  readonly reportedAt: Date;
  readonly reportedByUserId: string;
};
