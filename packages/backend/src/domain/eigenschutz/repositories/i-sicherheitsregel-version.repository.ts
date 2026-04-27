import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';

/**
 * Argumente für das Schreiben einer Version-Zeile (append-only).
 *
 * - `regelId`: Fremdschlüssel auf `Sicherheitsregel.id`
 * - `version`: monoton wachsende Versionsnummer — 1 für Initial-Version,
 *   `N+1` für jeden nachfolgenden Update
 * - `gueltigVon`: Anzeige-Zeitpunkt dieser Version (identisch zum
 *   `gueltigBis` der Vorversion — halb-offenes Intervall, siehe unten)
 * - `changedByUserId`: Audit-Pflichtfeld (Schema `String`, not null — AC9)
 * - `eventId`: CUID2 des zugehörigen Outbox-Events. Das `@unique`-Feld auf
 *   der Prisma-Tabelle verhindert doppelte Re-Processing-Versuche.
 */
export interface SaveSicherheitsregelVersionArgs {
  regelId: string;
  version: number;
  titel: string;
  inhalt: string;
  gueltigVon: Date;
  changedByUserId: string;
  eventId: string;
}

/**
 * Port für die Version-Chain (`sicherheitsregel_versionen`, Story 2.6).
 *
 * ## Chain-Intervall-Invariante (halb-offenes Intervall `[gueltigVon, gueltigBis)`)
 *
 * Analog zur Gefährdungsbeurteilungs-Chain (Story 2.3 / 2.4):
 *
 * - Beim Schreiben von `V_{n+1}` setzt die Repo-Implementierung
 *   `V_n.gueltigBis = V_{n+1}.gueltigVon` — **identischer Timestamp**.
 * - Das Intervall `[gueltigVon, gueltigBis)` einer Version ist **halb-offen**:
 *   der exakte Zeitpunkt `T = gueltigBis` gehört zur **Folge-Version**, nicht
 *   zur abgeschlossenen Vorversion.
 * - Die aktive („aktuelle") Version trägt `gueltigBis === null`.
 * - Eine logisch abgekündigte Regel (Story 2.6 AC4 Re-Wire) hat **keine**
 *   aktive Version: die bisherige wurde via `closeCurrentVersion` geschlossen,
 *   ohne Follower.
 */
export interface ISicherheitsregelVersionRepository {
  /**
   * Schreibt die initiale Version-Zeile (V1) nach `Sicherheitsregel.create`.
   * `gueltigBis` bleibt NULL; es darf noch keine ältere Zeile für dieselbe
   * `regelId` existieren (Schema-Invariante — Initial-Create).
   */
  saveInitialVersion(args: SaveSicherheitsregelVersionArgs, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Schreibt eine neue Version-Zeile als Append + schließt die vorherige
   * offene Version durch Setzen von `gueltigBis = args.gueltigVon`. Beides
   * MUSS innerhalb derselben Transaktion laufen. Eine Doppel-Schreibung
   * (gleiches `eventId`) wird durch den Unique-Constraint auf `event_id`
   * abgefangen.
   */
  saveNewVersion(args: SaveSicherheitsregelVersionArgs, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Schließt die aktuell offene Version (`gueltigBis IS NULL`) ohne einen
   * Follower anzulegen (Story 2.6 AC4 Re-Wire-Pfad). Single-UPDATE-Statement,
   * damit parallele Updates DB-seitig serialisieren (Lost-Update-Prävention
   * analog zu Story 2.3 Version-Chain-Hardening).
   */
  closeCurrentVersion(regelId: string, gueltigBis: Date, tx: TransactionContext): Promise<Result<void>>;
}
