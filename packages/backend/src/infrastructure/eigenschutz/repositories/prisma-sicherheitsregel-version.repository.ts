import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { TransactionContext } from '@domain/common/transaction';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { ISicherheitsregelVersionRepository, SaveSicherheitsregelVersionArgs, SicherheitsregelVersionAtTimeRow } from '@domain/eigenschutz/repositories';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { isPrismaP2002 } from '@/shared/utils/prisma.util';

type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Bekannte Match-Token für den `event_id`-Unique-Index auf
 * `sicherheitsregel_versionen`. Vgl. die äquivalente Konstante in der
 * Gefährdungsbeurteilung-Version-Repo — Rationale siehe dort.
 */
const EVENT_ID_INDEX_TOKENS: ReadonlySet<string> = new Set(['event_id', 'eventId', 'sicherheitsregel_versionen_event_id_key']);

/**
 * Schmalbandiger Guard (siehe Gefährdungsbeurteilung-Version-Repo): erkennt
 * ausschließlich P2002 gegen den `event_id`-Unique-Index und lässt alle
 * anderen Unique-Violations (z. B. `(regelId, version)`) unverändert als
 * echten Concurrency-Fehler durchfallen.
 */
function isEventIdConflict(error: unknown): boolean {
  if (!isPrismaP2002(error)) return false;
  const meta = (error as { meta?: unknown }).meta;
  const candidates: string[] = [];

  if (meta && typeof meta === 'object') {
    const target = (meta as { target?: unknown }).target;
    if (Array.isArray(target)) candidates.push(...target.filter((entry): entry is string => typeof entry === 'string'));
    else if (typeof target === 'string') candidates.push(target);

    const driver = (meta as { driverAdapterError?: unknown }).driverAdapterError;
    if (driver && typeof driver === 'object') {
      const cause = (driver as { cause?: unknown }).cause;
      if (cause && typeof cause === 'object') {
        const constraint = (cause as { constraint?: unknown }).constraint;
        if (constraint && typeof constraint === 'object') {
          const fields = (constraint as { fields?: unknown }).fields;
          if (Array.isArray(fields)) candidates.push(...fields.filter((entry): entry is string => typeof entry === 'string'));
          const name = (constraint as { name?: unknown }).name;
          if (typeof name === 'string') candidates.push(name);
        }
      }
    }
  }

  return candidates.some((entry) => EVENT_ID_INDEX_TOKENS.has(entry));
}

/**
 * Prisma-Adapter für `sicherheitsregel_versionen` (append-only).
 *
 * Analog zur Gefährdungsbeurteilungs-Version-Chain (Story 2.3/2.4) gilt die
 * **halb-offene Intervall-Invariante** `[gueltigVon, gueltigBis)`: beim
 * Schreiben von `V_{n+1}` wird `V_n.gueltigBis = V_{n+1}.gueltigVon` gesetzt
 * (identischer Timestamp); der exakte Zeitpunkt `T = gueltigBis` gehört zur
 * Folge-Version. Die aktive Version trägt `gueltigBis === null`.
 *
 * **Unterschied zur Gefährdungsbeurteilungs-Version:** Die Sicherheitsregel-
 * Version speichert den Snapshot (`titel`, `inhalt`) denormalisiert — es gibt
 * **keine** `items`-JSONB-Spalte und **kein** `changedFields`-Feld. Das ist
 * Absicht: Sicherheitsregeln sind Freitext, die Chain dient dem Audit/
 * Zeitreise-Read, nicht einem Diff-Protokoll.
 */
@Injectable()
export class PrismaSicherheitsregelVersionRepository implements ISicherheitsregelVersionRepository {
  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    private readonly prisma: PrismaService,
  ) {}

  async saveInitialVersion(args: SaveSicherheitsregelVersionArgs, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      await client.sicherheitsregelVersion.create({
        data: {
          regelId: args.regelId,
          version: args.version,
          titel: args.titel,
          inhalt: args.inhalt,
          gueltigVon: args.gueltigVon,
          changedByUserId: args.changedByUserId,
          eventId: args.eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      if (isEventIdConflict(error)) {
        this.logger.warn('Idempotenter Retry auf sicherheitsregel_versionen.event_id erkannt (saveInitialVersion)', {
          regelId: args.regelId,
          version: args.version,
          eventId: args.eventId,
        });
        return Result.ok<void>(undefined);
      }
      this.logger.error('Fehler beim Speichern der Initial-Version der Sicherheitsregel', {
        regelId: args.regelId,
        eventId: args.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  async saveNewVersion(args: SaveSicherheitsregelVersionArgs, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      // Chain-Closing: vorherige offene Version (gueltigBis IS NULL) schließen
      // (identischer Timestamp wie die neue Version — halb-offenes Intervall).
      // **Guard gegen Reaktivierung einer deprecated Regel:** Wenn `count === 0`,
      // gibt es keine offene Version mehr — die Regel wurde parallel
      // abgekündigt (Re-Wire einer anderen Tx). Eine neue aktive Version
      // anzulegen würde die Re-Wire-Wirkung annullieren. Stattdessen: Conflict.
      const closeResult = await client.sicherheitsregelVersion.updateMany({
        where: { regelId: args.regelId, gueltigBis: null },
        data: { gueltigBis: args.gueltigVon },
      });
      if (closeResult.count === 0) {
        this.logger.warn('saveNewVersion: keine offene Version — Regel ist deprecated, In-Place-Update wird verworfen', {
          regelId: args.regelId,
          version: args.version,
          eventId: args.eventId,
        });
        return Result.fail<void>('ConflictDetected:Sicherheitsregel');
      }

      await client.sicherheitsregelVersion.create({
        data: {
          regelId: args.regelId,
          version: args.version,
          titel: args.titel,
          inhalt: args.inhalt,
          gueltigVon: args.gueltigVon,
          changedByUserId: args.changedByUserId,
          eventId: args.eventId,
        },
      });
      return Result.ok<void>(undefined);
    } catch (error) {
      if (isEventIdConflict(error)) {
        this.logger.warn('Idempotenter Retry auf sicherheitsregel_versionen.event_id erkannt (saveNewVersion)', {
          regelId: args.regelId,
          version: args.version,
          eventId: args.eventId,
        });
        return Result.ok<void>(undefined);
      }
      this.logger.error('Fehler beim Speichern der neuen Version der Sicherheitsregel', {
        regelId: args.regelId,
        version: args.version,
        eventId: args.eventId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  /**
   * Schließt die aktuell offene Version (`gueltigBis IS NULL`) ohne Follower
   * (Story 2.6 AC4 Re-Wire-Pfad). Single-UPDATE-Statement → DB serialisiert
   * parallele Re-Wire-Versuche.
   *
   * **Idempotenz:** Kein offenes Intervall vorhanden → `count === 0` →
   * `Result.ok`. Das ist bewusst kein Fehler: ein Handler, der auf eine
   * bereits abgekündigte Regel ein zweites Deprecate abfeuert (z. B. bei
   * Outbox-Retry oder Race), soll konvergieren.
   */
  async closeCurrentVersion(regelId: string, gueltigBis: Date, tx: TransactionContext): Promise<Result<void>> {
    const client = tx as PrismaTransactionClient;
    try {
      const result = await client.sicherheitsregelVersion.updateMany({
        where: { regelId, gueltigBis: null },
        data: { gueltigBis },
      });
      if (result.count === 0) {
        this.logger.warn('closeCurrentVersion: keine offene Version gefunden (bereits abgekündigt?)', {
          regelId,
        });
      }
      return Result.ok<void>(undefined);
    } catch (error) {
      this.logger.error('Fehler beim Schließen der aktuellen Version der Sicherheitsregel', {
        regelId,
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<void>(error instanceof Error ? error.message : 'Unbekannter Datenbankfehler');
    }
  }

  /**
   * Story 5.2 AC6 — Point-in-Time-Lookup für den Vorfall-Snapshot.
   *
   * Halb-offene-Intervall-Semantik: `gueltigVon <= snapshotAt AND
   * (gueltigBis > snapshotAt OR gueltigBis IS NULL)`. Filter
   * `r.einsatzId = :einsatzId AND (r.einheitId = :einheitId OR
   * r.einheitId IS NULL)` — eine einsatzweite Regel matcht jede Einheit
   * im selben Einsatz.
   *
   * Sortierung `gueltigVon DESC, regelId ASC` — neueste-aktive-Versionen
   * zuerst, deterministisch über die `regelId`-Sekundärordnung.
   */
  async findVersionsForEinheitAtTime(einsatzId: string, einheitId: string, snapshotAt: Date, tx: TransactionContext): Promise<Result<SicherheitsregelVersionAtTimeRow[]>> {
    const client = tx as PrismaTransactionClient;
    try {
      const rows = await client.sicherheitsregelVersion.findMany({
        where: {
          gueltigVon: { lte: snapshotAt },
          OR: [{ gueltigBis: null }, { gueltigBis: { gt: snapshotAt } }],
          regel: {
            einsatzId,
            OR: [{ einheitId }, { einheitId: null }],
          },
        },
        include: {
          regel: { select: { einheitId: true } },
        },
        orderBy: [{ gueltigVon: 'desc' }, { regelId: 'asc' }],
      });
      const mapped: SicherheitsregelVersionAtTimeRow[] = rows.map((row) => ({
        regelId: row.regelId,
        versionId: row.id,
        version: row.version,
        titel: row.titel,
        inhalt: row.inhalt,
        einheitId: row.regel.einheitId,
        einsatzweit: row.regel.einheitId === null,
        gueltigVon: row.gueltigVon,
      }));
      return Result.ok(mapped);
    } catch (error) {
      this.logger.error('Fehler bei Point-in-Time-Sicherheitsregel-Versionen-Lookup', {
        einsatzId,
        einheitId,
        snapshotAt: snapshotAt.toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      return Result.fail<SicherheitsregelVersionAtTimeRow[]>('InfrastructureError:LoadSicherheitsregelVersionsAtTime');
    }
  }
}
