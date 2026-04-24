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
 * Infrastructure-naher Row-Typ für eine einzelne Version-Zeile der Chain
 * (Story 2.4, Vorversionen-Timeline).
 *
 * Der Typ spiegelt genau die DB-Spalten wider; er ist absichtlich **kein**
 * Aggregate und **kein** Domain-Value-Object — das Timeline-Read-Model
 * rendert die Items direkt aus dem JSONB, ohne einen Rehydrierungs-Pfad
 * über `Gefaehrdungsbeurteilung.reconstitute()`. Grund: Read-Model-Pfad
 * (Timeline) ist orthogonal zum Write-Pfad (Aggregate) und braucht keine
 * Invariant-Enforcement mehr — die Invarianten waren beim Schreiben aktiv.
 *
 * Items werden trotzdem als `GefaehrdungItem[]` modelliert, damit die
 * Application-/DTO-Schicht die bestehende `toGefaehrdungItemDto`-Factory
 * wiederverwenden kann.
 */
export interface GefaehrdungsbeurteilungVersionRow {
  version: number;
  items: GefaehrdungItem[];
  changedFields: Record<string, unknown>;
  gueltigVon: Date;
  gueltigBis: Date | null;
  changedByUserId: string;
  eventId: string | null;
}

/**
 * Port für die Version-Chain (`gefaehrdungsbeurteilung_versionen`). Story 2.1
 * liefert `saveInitialVersion`; Story 2.2 ergänzt `saveNewVersion` für den
 * Update-Pfad (inkl. Chain-Closing der Vorversion), Story 2.4
 * `findVersionsByBeurteilung`.
 *
 * ## Chain-Intervall-Invariante (halb-offenes Intervall `[gueltigVon, gueltigBis)`)
 *
 * Seit Story 2.3 gilt die Chain-Semantik: beim Schreiben von `V_{n+1}` setzt
 * die Repo-Implementierung `V_n.gueltigBis = V_{n+1}.gueltigVon` — **identischer
 * Timestamp** (siehe `prisma-gefaehrdungsbeurteilung-version.repository.ts`
 * `saveNewVersion`). Story 2.4 schärft die Query-Semantik daraus:
 *
 * - Das Intervall `[gueltigVon, gueltigBis)` einer Version ist **halb-offen**:
 *   der exakte Zeitpunkt `T = gueltigBis` gehört zur **Folge-Version**, nicht
 *   zur abgeschlossenen Vorversion.
 * - Die aktive („aktuelle") Version trägt `gueltigBis === null`.
 * - Die resultierende Point-in-Time-Query lautet:
 *
 *   ```sql
 *   SELECT * FROM gefaehrdungsbeurteilung_versionen
 *   WHERE gef_beurteilung_id = :id
 *     AND gueltig_von <= :T
 *     AND (gueltig_bis > :T OR gueltig_bis IS NULL)
 *   ```
 *
 * Story 2.4 (Timeline) konsumiert die Invariante **noch nicht** direkt
 * (die Timeline listet alle Versionen, sie navigiert nicht zum Zeitpunkt T);
 * die Point-in-Time-Query wird erstmals in Story 5.2 (Vorfall-Snapshot)
 * gebraucht. Die Invariante wird hier dokumentiert, damit spätere
 * Konsumenten darauf aufbauen können.
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

  /**
   * Lädt alle Version-Zeilen einer Gefährdungsbeurteilung, absteigend sortiert
   * nach `(gueltigVon DESC, version DESC)` (Story 2.4, Timeline-Read-Path).
   *
   * **Sortierung:** Der primäre Schlüssel ist `gueltigVon` (Anzeige-Zeitpunkt),
   * der sekundäre `version` (streng monoton). Zwei Version-Zeilen können in
   * seltenen Fällen — z. B. schnell aufeinanderfolgende Updates im gleichen
   * Millisekunden-Tick — denselben `gueltigVon`-Wert haben; `version` bricht
   * den Tie deterministisch.
   *
   * **Intervall-Semantik:** Siehe JSDoc am Interface-Header oben
   * (halb-offenes Intervall `[gueltigVon, gueltigBis)`, aktive Version hat
   * `gueltigBis === null`).
   *
   * **Kein TX-Parameter:** Reiner Read — wird außerhalb des Transactional-
   * Command-Handler-Pfads aufgerufen (Query-Handler).
   */
  findVersionsByBeurteilung(gefBeurteilungId: string): Promise<Result<GefaehrdungsbeurteilungVersionRow[]>>;
}
