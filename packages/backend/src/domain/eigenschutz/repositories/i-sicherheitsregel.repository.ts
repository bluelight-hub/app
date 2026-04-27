import type { TransactionContext } from '@domain/common';
import type { Result } from '@domain/common/result';
import type { Sicherheitsregel } from '../aggregates/sicherheitsregel.aggregate';

/**
 * Read-Model für GET-Responses einer Sicherheitsregel (Story 2.6 AC6).
 *
 * Enthält zusätzlich zu den Aggregate-Feldern die Persistenz-Metadaten
 * (`erstelltAm`, `aktualisiertAm`, `aktualisiertVonUserId`) und die logische
 * Gruppen-Identität (`propagationGroupId`), die beim Create-Zeitpunkt in der
 * initialen Version-Zeile hinterlegt wurde.
 *
 * **Warum `propagationGroupId` im Read-Model?** Die ID lebt laut Epic-
 * Entscheidung **nicht** auf der Haupt-Row, sondern im Event-Payload der
 * ersten Version. Das Repository liest sie aus der ersten `gueltigVon`-
 * Version-Zeile (bzw. aus einem separaten Cache) und hängt sie ans Read-
 * Model an — damit die API-Response (AC6) die ID ausliefern kann, ohne dass
 * das Aggregate sie kennen muss.
 */
export interface SicherheitsregelReadModel {
  aggregate: Sicherheitsregel;
  erstelltAm: Date;
  aktualisiertAm: Date;
  aktualisiertVonUserId: string;
  propagationGroupId: string;
}

/**
 * Port (Hexagonal-Architektur) für die Persistierung der
 * `Sicherheitsregel`-Aggregate (Story 2.6).
 *
 * Implementierungen liegen im Infrastructure-Layer
 * (`infrastructure/eigenschutz/repositories/`).
 *
 * **Scope Story 2.6:** Create, Lookup, Active-List, Deprecate (Re-Wire),
 * Update mit neuer Version. Quittungs-Operationen (Story 2.7) leben in einem
 * eigenen Port.
 */
export interface ISicherheitsregelRepository {
  /**
   * Speichert das Aggregate innerhalb der übergebenen Transaktion. Der
   * Aufrufer (TransactionalCommandHandler) garantiert, dass Outbox-Events
   * atomar in derselben Transaktion committed werden.
   *
   * `aktualisiertVonUserId` muss explizit gesetzt werden — das Aggregate
   * trägt die Identität des Aufrufers, die Persistenz-Row spiegelt sie 1:1.
   */
  save(aggregate: Sicherheitsregel, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Lädt eine Regel per ID innerhalb des gegebenen Einsatzes. Der
   * `einsatzId`-Parameter ist nicht optional: Einsatz-Scoping ist
   * Bestandteil der Query, damit Cross-Einsatz-Lookups ausgeschlossen sind
   * (Memory-Note „Einsatz-Routen-Nesting"). Liefert `Result.ok(null)`, wenn
   * keine Zeile existiert.
   */
  findById(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<Sicherheitsregel | null>>;

  /**
   * Lädt eine Regel als Read-Model (inkl. Timestamps +
   * `aktualisiertVonUserId` + `propagationGroupId`). Wird vom GET-Controller
   * für das Response-DTO genutzt. Liefert `Result.ok(null)`, wenn keine
   * Zeile existiert.
   */
  findReadModelById(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<SicherheitsregelReadModel | null>>;

  /**
   * Lädt alle **aktiven** Regeln eines Einsatzes als Read-Model-Liste
   * (AC6 — nur Rows mit `SicherheitsregelVersion.gueltigBis IS NULL`).
   *
   * Sortierung ist Teil des Repository-Kontrakts: zuletzt aktualisierte
   * Regeln zuerst (`aktualisiertAm DESC`), stabilisiert über `erstelltAm`
   * und `id`.
   *
   * **Filter-Parameter `einheitId` (AC6 zweiter Teil):**
   * - `undefined` → alle aktiven Regeln des Einsatzes (einsatzweit + alle Einheiten)
   * - `null` → nur einsatzweite Regeln (`einheitId IS NULL`)
   * - `string` → einsatzweite + Regeln dieser konkreten Einheit
   *   (für Story 2.7 / Abschnittsleiter-Sicht)
   */
  findActiveByEinsatz(einsatzId: string, einheitId?: string | null, tx?: TransactionContext): Promise<Result<SicherheitsregelReadModel[]>>;

  /**
   * Markiert eine Regel logisch als abgekündigt (AC4 Re-Wire-Pfad).
   *
   * Schließt die aktuell offene `SicherheitsregelVersion`
   * (`gueltigBis = now()`) und aktualisiert `aktualisiertAm` plus
   * `aktualisiertVonUserId` auf der Haupt-Row. Es wird **keine** neue
   * aktive Version angelegt — die Row fällt damit aus `findActiveByEinsatz`
   * heraus. Physischer Delete findet **nicht** statt (append-only
   * Version-Historie, FR42).
   *
   * **DB-Level-OCC:** Die Implementation prüft `version === expectedVersion`
   * im UPDATE-WHERE — zwei parallele Re-Wire-PUTs werden so serialisiert
   * (Story 2.6 Code-Review-Patch). Sentinels:
   * - `NotFound:Sicherheitsregel` — Regel existiert nicht (mehr) im Einsatz
   * - `ConflictDetected:Sicherheitsregel` — Version-Mismatch auf DB-Ebene
   */
  deprecate(id: string, einsatzId: string, aktualisiertVonUserId: string, expectedVersion: number, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Schreibt das bestehende Aggregate zurück (Titel/Inhalt/Einheit + neue
   * Version). Der Aufrufer (Handler) garantiert, dass die Aggregate-Version
   * bereits inkrementiert wurde und der Conflict-Check auf Aggregate-Ebene
   * erfolgt ist. Das Repo aktualisiert `titel`, `inhalt`, `einheitId`,
   * `version`, `aktualisiertAm` (Prisma `@updatedAt`) und
   * `aktualisiertVonUserId` atomar innerhalb der übergebenen Transaction.
   */
  updateWithNewVersion(aggregate: Sicherheitsregel, aktualisiertVonUserId: string, tx: TransactionContext): Promise<Result<void>>;

  /**
   * Lädt eine Regel UND prüft via Version-Join, dass mindestens eine offene
   * `SicherheitsregelVersion` existiert (Story 2.7). Liefert das Aggregate mit
   * `istAktiv === true`; bei deprecated-Status oder fehlendem Match wird
   * `null` zurückgegeben.
   *
   * Wird vom Quittungs-Handler genutzt, um „Quittung auf abgekündigter Regel"
   * vor dem Aggregate-Check abzuwehren — ohne dass der Standard-`findById`
   * (der für andere Pfade „aktiv-agnostisch" bleibt) sein Verhalten ändert.
   */
  findActiveById(id: string, einsatzId: string, tx?: TransactionContext): Promise<Result<Sicherheitsregel | null>>;
}
