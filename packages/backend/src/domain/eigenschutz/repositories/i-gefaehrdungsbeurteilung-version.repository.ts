import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { GefaehrdungItem } from '../value-objects/gefaehrdung-item.vo';

/**
 * Argumente für das Schreiben einer Version-Zeile (append-only).
 *
 * - `changedFields`: dient als Markierung der Änderung. Für die initiale
 *   Version aus Story 2.1 setzt der Handler `{ created: true }`.
 * - `eventId`: CUID2 des zugehörigen Outbox-Events. Das `@unique`-Feld auf
 *   der Prisma-Tabelle verhindert doppelte Re-Processing-Versuche.
 */
export interface SaveInitialVersionArgs {
  gefBeurteilungId: string;
  version: number;
  items: GefaehrdungItem[];
  changedFields: Record<string, unknown>;
  gueltigVon: Date;
  changedByUserId: string;
  eventId: string;
}

/**
 * Argumente für eine nicht-initiale Version-Zeile. Die Version-Chain-Semantik
 * (`gueltigBis` auf der Vorversion setzen) ist Bestandteil der Repo-
 * Implementierung, nicht Aufgabe des Handlers.
 */
export interface SaveNewVersionArgs {
  gefBeurteilungId: string;
  version: number;
  items: GefaehrdungItem[];
  changedFields: Record<string, unknown>;
  gueltigVon: Date;
  changedByUserId: string;
  eventId: string;
}

/**
 * Port für die Version-Chain (`gefaehrdungsbeurteilung_versionen`). Story 2.1
 * liefert `saveInitialVersion`; Story 2.2 ergänzt `saveNewVersion` für den
 * Update-Pfad (inkl. Chain-Closing der Vorversion), Story 2.4
 * `findVersionsByBeurteilung`.
 */
export interface IGefaehrdungsbeurteilungVersionRepository {
  saveInitialVersion(args: SaveInitialVersionArgs, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Schreibt eine neue Version-Zeile als Append + schließt die vorherige
   * offene Version durch Setzen von `gueltigBis = args.gueltigVon`. Beides
   * MUSS innerhalb derselben Transaktion laufen. Eine Doppel-Schreibung
   * (gleiches `eventId`) wird durch den Unique-Constraint auf `event_id`
   * abgefangen.
   */
  saveNewVersion(args: SaveNewVersionArgs, tx: TransactionContext): Promise<Result<void>>;
}
