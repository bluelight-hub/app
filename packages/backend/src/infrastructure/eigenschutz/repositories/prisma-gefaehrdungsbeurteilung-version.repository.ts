import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { GefaehrdungsbeurteilungVersionRow, IGefaehrdungsbeurteilungVersionRepository, SaveInitialVersionArgs, SaveNewVersionArgs } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
// Hinweis: DI-Import-Regel (CLAUDE.md AC1) — Injectable Class mit regulärem
// `import`, niemals `import type`.
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';
import { PrismaGefaehrdungsbeurteilungMapper } from './mappers/gefaehrdungsbeurteilung.mapper';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Bekannte Match-Token für den `event_id`-Unique-Index. Präzise Strings —
 * kein Substring-Match auf freier Fehler-Message — damit ein fremder
 * Constraint (z. B. Foreign-Key-Name, der `event_id` enthält) niemals als
 * idempotenter Outbox-Retry verschluckt werden kann.
 */
const EVENT_ID_INDEX_TOKENS: ReadonlySet<string> = new Set([
  'event_id', // DB-Spalte (klassisches Prisma `meta.target` als ['event_id'])
  'eventId', // Prisma-Feldname in camelCase (exotisches Target-Shape)
  'gefaehrdungsbeurteilung_versionen_event_id_key', // expliziter Index-Name
]);

/**
 * Schmalbandiger Guard: prüft, ob ein Prisma-P2002 ausgerechnet gegen den
 * `event_id`-Unique-Index verletzt wurde. Nur dieser Zielindex rechtfertigt
 * einen idempotenten Erfolg bei Outbox-Retries — jede andere Unique-Violation
 * (z. B. `(gefBeurteilungId, version)`) bleibt ein echter Concurrency-Bug und
 * muss als `Result.fail` propagiert werden.
 *
 * Prisma liefert das Constraint-Ziel je nach Version/Driver unterschiedlich:
 *  - Prisma 7 mit Driver-Adapter (aktuell in diesem Projekt): eingebettet in
 *    `meta.driverAdapterError.cause.constraint.fields` (string[], DB-Spalten).
 *    Der Index-Name lässt sich aus dem Constraint-Objekt via `.name` lesen,
 *    NICHT aus der freien `originalMessage` (dort wäre er nur via Substring
 *    erreichbar, was bei Index-Namens-Ähnlichkeiten false-positives riskiert).
 *  - Klassisches Prisma / ältere Versionen: `meta.target` als `string[]`
 *    (z. B. `['event_id']`) oder `string`.
 *  - Exotisch: Prisma-Feldname in camelCase (`'eventId'`).
 *
 * Matching erfolgt auf Set-Equality gegen {@link EVENT_ID_INDEX_TOKENS} —
 * `originalMessage` wird bewusst NICHT mehr als Kandidat herangezogen.
 */
function isEventIdConflict(error: unknown): boolean {
  if (!isPrismaP2002(error)) return false;
  const meta = (error as { meta?: unknown }).meta;
  const candidates: string[] = [];

  if (meta && typeof meta === 'object') {
    // Klassisches Prisma-Shape: meta.target als string[] | string.
    const target = (meta as { target?: unknown }).target;
    if (Array.isArray(target)) candidates.push(...target.filter((entry): entry is string => typeof entry === 'string'));
    else if (typeof target === 'string') candidates.push(target);

    // Prisma-7-Driver-Adapter-Shape: meta.driverAdapterError.cause.*
    const driver = (meta as { driverAdapterError?: unknown }).driverAdapterError;
    if (driver && typeof driver === 'object') {
      const cause = (driver as { cause?: unknown }).cause;
      if (cause && typeof cause === 'object') {
        const constraint = (cause as { constraint?: unknown }).constraint;
        if (constraint && typeof constraint === 'object') {
          const fields = (constraint as { fields?: unknown }).fields;
          if (Array.isArray(fields)) candidates.push(...fields.filter((entry): entry is string => typeof entry === 'string'));
          // Der Constraint-Name (Prisma >= 6) ist der sauberste Discriminator;
          // er ist nicht substring-basiert, sondern ein exakter Index-Identifier.
          const name = (constraint as { name?: unknown }).name;
          if (typeof name === 'string') candidates.push(name);
        }
      }
    }
  }

  return candidates.some((entry) => EVENT_ID_INDEX_TOKENS.has(entry));
}

/**
 * Prisma-Adapter für `gefaehrdungsbeurteilung_versionen` (append-only).
 *
 * Die Version-Zeile ist die Single-Source-of-Truth für „wer hat wann welchen
 * Stand gelesen" — Story 2.4 baut die Timeline darauf auf. Das `eventId`-
 * Unique-Constraint verhindert Doppel-Processing bei einem Outbox-Retry.
 *
 * ## Chain-Intervall-Invariante (halb-offenes Intervall `[gueltigVon, gueltigBis)`)
 *
 * Die Schreib-Methoden etablieren, die Read-Methode konsumiert: beim Schreiben
 * von `V_{n+1}` setzt {@link saveNewVersion} `V_n.gueltigBis = V_{n+1}.gueltigVon`
 * (identischer Timestamp). Für Point-in-Time-Queries gilt deshalb
 * halb-offene Semantik — der Zeitpunkt `T = gueltigBis` gehört zur
 * **Folge-Version**, nicht zur abgeschlossenen Vorversion. Die aktive Version
 * trägt `gueltigBis === null`.
 *
 * ```sql
 * -- Point-in-Time-Query (Story 5.2 Vorfall-Snapshot):
 * SELECT * FROM gefaehrdungsbeurteilung_versionen
 * WHERE gef_beurteilung_id = :id
 *   AND gueltig_von <= :T
 *   AND (gueltig_bis > :T OR gueltig_bis IS NULL)
 * ```
 *
 * Story 2.4 (Timeline) nutzt die Invariante aktuell nicht direkt — die
 * Timeline listet alle Versionen, sie navigiert nicht zum Zeitpunkt T. Die
 * Doku hier ist der vertragliche Anker für spätere Konsumenten (primär
 * Story 5.2).
 */
@Injectable()
export class PrismaGefaehrdungsbeurteilungVersionRepository implements IGefaehrdungsbeurteilungVersionRepository {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly prisma: PrismaService,
  ) {}

  async saveInitialVersion(args: SaveInitialVersionArgs, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      await client.gefaehrdungsbeurteilungVersion.create({
        data: {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          items: PrismaGefaehrdungsbeurteilungMapper.toPersistenceItems(args.items) as unknown as Prisma.InputJsonValue,
          changedFields: args.changedFields as Prisma.InputJsonValue,
          gueltigVon: args.gueltigVon,
          changedByUserId: args.changedByUserId,
          eventId: args.eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      // Outbox-Retry-Idempotenz: P2002 ausschließlich auf `event_id` bedeutet,
      // dass dieselbe Initial-Version bereits aus einem vorherigen Versuch
      // persistiert wurde — wir konvergieren auf Erfolg. Andere P2002-Ziele
      // (z. B. `(gefBeurteilungId, version)`) bleiben echte Concurrency-Fehler.
      if (isEventIdConflict(error)) {
        this.logger.warn('Idempotenter Retry auf gefaehrdungsbeurteilung_versionen.event_id erkannt (saveInitialVersion)', {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          eventId: args.eventId,
        });
        return Result.ok<void>(undefined);
      }
      this.logger.error('Fehler beim Speichern der Initial-Version', {
        gefBeurteilungId: args.gefBeurteilungId,
        eventId: args.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async saveNewVersion(args: SaveNewVersionArgs, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      // Chain-Closing: vorherige offene Version (gueltigBis IS NULL) auf das
      // aktuelle Event-Timestamp setzen — identisch für die kanonisch
      // vorletzte Zeile. `updateMany` ist idempotent: wenn keine Zeile offen
      // ist, wird nichts geändert; ein Outbox-Retry derselben eventId
      // verletzt die neue INSERT-Unique-Constraint, nicht dieses UPDATE.
      await client.gefaehrdungsbeurteilungVersion.updateMany({
        where: { gefBeurteilungId: args.gefBeurteilungId, gueltigBis: null },
        data: { gueltigBis: args.gueltigVon },
      });

      await client.gefaehrdungsbeurteilungVersion.create({
        data: {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          items: PrismaGefaehrdungsbeurteilungMapper.toPersistenceItems(args.items) as unknown as Prisma.InputJsonValue,
          changedFields: args.changedFields as Prisma.InputJsonValue,
          gueltigVon: args.gueltigVon,
          changedByUserId: args.changedByUserId,
          eventId: args.eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      // Outbox-Retry-Idempotenz: eine P2002 ausschließlich auf `event_id`
      // bedeutet, dass diese Version schon angelegt wurde (Retry nach
      // partiellem Commit). Nur in diesem Fall melden wir Erfolg, damit der
      // Retry-Pfad konvergiert. Ein P2002 auf `(gefBeurteilungId, version)` ist
      // dagegen ein echter Concurrency-Bug (zwei parallele Writes auf dieselbe
      // Versionsnummer) und bleibt als Fehler sichtbar.
      if (isEventIdConflict(error)) {
        this.logger.warn('Idempotenter Retry auf gefaehrdungsbeurteilung_versionen.event_id erkannt (saveNewVersion)', {
          gefBeurteilungId: args.gefBeurteilungId,
          version: args.version,
          eventId: args.eventId,
        });
        return Result.ok<void>(undefined);
      }
      this.logger.error('Fehler beim Speichern der neuen Version', {
        gefBeurteilungId: args.gefBeurteilungId,
        version: args.version,
        eventId: args.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  /**
   * Lädt alle Version-Zeilen einer Gefährdungsbeurteilung, absteigend sortiert
   * nach `(gueltigVon DESC, version DESC)` (Story 2.4, Timeline-Read-Path).
   *
   * Die Query nutzt den bestehenden Index `@@index([gefBeurteilungId,
   * gueltigVon])` aus `schema.prisma` — Postgres-B-Tree unterstützt den
   * DESC-Scan ohne zusätzlichen Index-Build.
   *
   * Fehler-Fall: Alle `Error`-Instanzen werden auf den Sentinel
   * `InfrastructureError:LoadVersions` normalisiert, damit der Controller
   * das Fehler-Mapping über `mapQueryError` auf HTTP 500 vornehmen kann.
   *
   * Für die Intervall-Semantik siehe den Klassen-Header oben
   * (halb-offenes `[gueltigVon, gueltigBis)`).
   */
  async findVersionsByBeurteilung(gefBeurteilungId: string): Promise<Result<GefaehrdungsbeurteilungVersionRow[]>> {
    try {
      const rows = await this.prisma.gefaehrdungsbeurteilungVersion.findMany({
        where: { gefBeurteilungId },
        orderBy: [{ gueltigVon: 'desc' }, { version: 'desc' }],
      });
      return Result.ok<GefaehrdungsbeurteilungVersionRow[]>(rows.map((row) => PrismaGefaehrdungsbeurteilungMapper.toVersionRow(row)));
    } catch (error) {
      this.logger.error('Fehler beim Laden der Versions-Chain', {
        gefBeurteilungId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<GefaehrdungsbeurteilungVersionRow[]>('InfrastructureError:LoadVersions');
    }
  }

  /**
   * Story 5.2 AC4 — Point-in-Time-Lookup für den Vorfall-Snapshot.
   *
   * Halb-offene-Intervall-Semantik: `gueltigVon <= snapshotAt AND
   * (gueltigBis > snapshotAt OR gueltigBis IS NULL)`. Der Edge-Fall
   * `gueltigBis === snapshotAt` zählt **zur Folge-Version**, nicht zur
   * abgeschlossenen Version (siehe Klassen-Header).
   *
   * Implementierung: Prisma-Composite-Where mit Join auf
   * `Gefaehrdungsbeurteilung` für das einsatz/einheit-Scoping. Genutzter
   * Index: `@@index([gefBeurteilungId, gueltigVon])` plus Filter auf
   * `gueltigBis` (Postgres-Bitmap-Scan).
   */
  async findVersionAtTimeForEinheit(
    einsatzId: string,
    einheitId: string,
    snapshotAt: Date,
    tx: TransactionContext,
  ): Promise<Result<(GefaehrdungsbeurteilungVersionRow & { gefBeurteilungId: string; versionId: string }) | null>> {
    const client = tx as PrismaTransactionClient;
    try {
      const row = await client.gefaehrdungsbeurteilungVersion.findFirst({
        where: {
          gueltigVon: { lte: snapshotAt },
          OR: [{ gueltigBis: null }, { gueltigBis: { gt: snapshotAt } }],
          gefBeurteilung: {
            einsatzId,
            einheitId,
          },
        },
      });
      if (!row) {
        return Result.ok<(GefaehrdungsbeurteilungVersionRow & { gefBeurteilungId: string; versionId: string }) | null>(null);
      }
      // `versionId === row.id` ist das FK-Ziel auf `GefaehrdungsbeurteilungVersion.id`,
      // `gefBeurteilungId` ist der Parent-Aggregat-Schlüssel (Cross-Reference).
      return Result.ok({
        ...PrismaGefaehrdungsbeurteilungMapper.toVersionRow(row),
        gefBeurteilungId: row.gefBeurteilungId,
        versionId: row.id,
      });
    } catch (error) {
      this.logger.error('Fehler bei Point-in-Time-Version-Lookup', {
        einsatzId,
        einheitId,
        snapshotAt: snapshotAt.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<(GefaehrdungsbeurteilungVersionRow & { gefBeurteilungId: string; versionId: string }) | null>('InfrastructureError:LoadVersionAtTime');
    }
  }
}
