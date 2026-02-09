import { IErinnerungRepository } from '@domain/repositories/i-erinnerung.repository';
import type { TransactionContext } from '@domain/common/transaction';
import { Erinnerung } from '@domain/entities/erinnerung.entity';
import { ErinnerungId } from '@domain/value-objects/erinnerung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { PrismaClient } from '@/generated/prisma/client';
// biome-ignore lint/style/noRestrictedImports: Logger wird direkt in Repository verwendet (kein DI-Context für statischen Logger)
import { Injectable, Logger } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaErinnerungMapper } from './mappers/prisma-erinnerung.mapper';
import type { ErinnerungStatistik, ErinnerungStatusCounts } from '@domain/repositories/erinnerung-statistik';
import type { PersonErinnerungStatistik } from '@domain/repositories/person-erinnerung-statistik';
import type { ZeitverlaufStatistik, ZeitverlaufBucket } from '@domain/repositories/zeitverlauf-statistik';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Prisma Implementation des IErinnerungRepository (Hexagonal Architecture).
 *
 * Diese Klasse implementiert das Domain Repository Port Interface
 * mit Prisma ORM als Persistence Technology. Sie ist Teil der
 * Infrastructure Layer und damit austauschbar (z.B. durch TypeORM,
 * MongoDB, In-Memory Implementation für Tests).
 *
 * **PERSISTENCE STRATEGY:**
 *
 * 1. **Upsert Pattern:**
 *    - save() nutzt Prisma upsert() für idempotente Persistierung
 *    - Prüft NICHT vorher ob Erinnerung existiert (Performance)
 *    - CREATE vs UPDATE wird automatisch anhand ID entschieden
 *
 * 2. **Result Pattern:**
 *    - Alle Methoden geben `Result<T>` zurück
 *    - Prisma Errors werden gefangen und als Result.fail() zurückgegeben
 *    - Explizites Error Handling ohne Exceptions für erwartete Fehler
 *
 * 3. **Transaction Support:**
 *    - Optional tx Parameter für atomare Multi-Aggregate Operations
 *    - Wenn tx=undefined: Verwendet PrismaService (Auto-Commit)
 *    - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
 *
 * **TRANSACTIONAL OUTBOX PATTERN:**
 * - Repository persistiert NUR das Erinnerung Aggregate
 * - Domain Events werden vom TransactionalCommandHandler in Outbox gespeichert
 * - clearDomainEvents() wird NICHT im Repository aufgerufen
 *
 * @example
 * ```typescript
 * // In Command Handler (Application Layer)
 * constructor(
 *   @Inject(ERINNERUNG_REPOSITORY)
 *   private readonly repository: IErinnerungRepository
 * ) {}
 *
 * async execute(command: CreateErinnerungCommand): Promise<Result<string>> {
 *   const erinnerung = Erinnerung.create(...).value!;
 *   const saveResult = await this.repository.save(erinnerung, tx);
 *   if (saveResult.isFailure) {
 *     return Result.fail(saveResult.error);
 *   }
 *   return Result.ok(erinnerung.id.toString());
 * }
 * ```
 */
@Injectable()
export class PrismaErinnerungRepository implements IErinnerungRepository {
  private readonly logger = new Logger(PrismaErinnerungRepository.name);

  /**
   * Constructor mit PrismaService Dependency Injection.
   *
   * PrismaService wird von NestJS gemanaged und stellt den
   * Prisma Client zur Verfügung. Singleton-Pattern im App-Lifecycle.
   *
   * @param prisma - PrismaService (NestJS-managed Singleton)
   */
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Speichert das Erinnerung Aggregate (Upsert: Create oder Update).
   *
   * **Upsert Strategy:**
   * - Prisma upsert() entscheidet automatisch CREATE vs UPDATE
   * - Idempotent: Mehrfaches save() mit demselben Aggregate ist safe
   *
   * **Transaction Handling:**
   * - Wenn tx=undefined: Auto-Commit (einzelne Operation)
   * - Wenn tx=provided: Nutzt externe Transaction (Handler-Level)
   *
   * **WICHTIG - Transactional Outbox:**
   * - Domain Events bleiben im Aggregate (TransactionalCommandHandler extrahiert sie)
   * - Repository ruft NICHT clearDomainEvents() auf
   *
   * @param aggregate - Das zu speichernde Erinnerung Aggregate
   * @param tx - Optionale externe Transaktion
   * @returns Result<void> - Success oder Failure mit Error Message
   */
  async save(aggregate: Erinnerung, tx?: TransactionContext): Promise<Result<void>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;
      const data = PrismaErinnerungMapper.toPersistence(aggregate);

      await client.erinnerung.upsert({
        where: { id: data.id },
        create: {
          id: data.id,
          einsatzId: data.einsatzId,
          titel: data.titel,
          beschreibung: data.beschreibung,
          faelligAm: data.faelligAm,
          status: data.status,
          erstelltVon: data.erstelltVon,
          // Zuweisungsfelder (Story 3.4) - werden bei create mit assignedToId gesetzt
          assignedToId: data.assignedToId,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt,
          // Pflichtfeld-Flag (Story 2.x) - wird bei Erstellung gesetzt
          requiresNote: data.requiresNote,
          // Eskalation (Story 4.1)
          eskalationsPersonId: data.eskalationsPersonId,
          // Story 4.10: Delegation ohne Eskalationsrecht
          eskalationNurAnErsteller: data.eskalationNurAnErsteller,
          // Intensivierungs-Counter (Hotfix für Endlos-Loop)
          intensivierungsCount: data.intensivierungsCount,
          // Story 5.4: ETB-Verknuepfung (bidirektional)
          etbEntryId: data.etbEntryId,
          // Recurring Felder (Story 6.4)
          isRecurring: data.isRecurring,
          recurringIntervalMinutes: data.recurringIntervalMinutes,
          recurringEndDate: data.recurringEndDate,
          recurringMaxCount: data.recurringMaxCount,
          recurringCurrentCount: data.recurringCurrentCount,
          parentErinnerungId: data.parentErinnerungId,
          recurringSequenceNumber: data.recurringSequenceNumber,
        },
        update: {
          titel: data.titel,
          beschreibung: data.beschreibung,
          faelligAm: data.faelligAm,
          status: data.status,
          // Auslösung Feld (Story 1.5) - wird bei ausloesen() gesetzt
          ausgeloestAm: data.ausgeloestAm,
          // Soft-Delete Felder (Story 1.4) - werden bei delete() gesetzt
          isDeleted: data.isDeleted,
          deletedAt: data.deletedAt,
          deletedBy: data.deletedBy,
          // Acknowledge Felder (Story 1.6) - werden bei acknowledge() gesetzt
          acknowledgedAm: data.acknowledgedAm,
          acknowledgedBy: data.acknowledgedBy,
          // Snooze Felder (Story 2.1) - werden bei snooze() gesetzt
          snoozedAt: data.snoozedAt,
          snoozedBy: data.snoozedBy,
          snoozedUntil: data.snoozedUntil,
          snoozeCount: data.snoozeCount,
          // Erledigt Felder (Story 2.5) - werden bei markErledigt() gesetzt
          erledigtAm: data.erledigtAm,
          erledigtBy: data.erledigtBy,
          erledigungsNotiz: data.erledigungsNotiz,
          // Zuweisung Felder (Story 3.3/3.4) - werden bei assignToUser() gesetzt
          assignedToId: data.assignedToId,
          assignedBy: data.assignedBy,
          assignedAt: data.assignedAt,
          // Eskalation Felder (Story 4.1/4.5) - werden bei eskalieren() gesetzt
          eskalationsPersonId: data.eskalationsPersonId,
          eskalationNurAnErsteller: data.eskalationNurAnErsteller, // Story 4.10
          escalatedAt: data.escalatedAt,
          previousAssigneeId: data.previousAssigneeId,
          // Hotfix: Intensivierungs-Counter
          intensivierungsCount: data.intensivierungsCount,
          // Recurring Felder (Story 6.4) - recurringCurrentCount kann sich ändern
          isRecurring: data.isRecurring,
          recurringIntervalMinutes: data.recurringIntervalMinutes,
          recurringEndDate: data.recurringEndDate,
          recurringMaxCount: data.recurringMaxCount,
          recurringCurrentCount: data.recurringCurrentCount,
          parentErinnerungId: data.parentErinnerungId,
          recurringSequenceNumber: data.recurringSequenceNumber,
          // einsatzId und erstelltVon sind immutable nach Erstellung
        },
      });

      // NOTE: clearDomainEvents() wird NICHT aufgerufen!
      // TransactionalCommandHandler extrahiert Events via getDomainEvents()

      return Result.ok(undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to save Erinnerung: ${message}`);
    }
  }

  /**
   * Findet ein Erinnerung Aggregate anhand seiner ID.
   *
   * **NULL Handling:**
   * - Wenn Erinnerung nicht existiert: Result.ok(null)
   * - Domain Layer kann explizit prüfen: if (result.value === null)
   *
   * @param id - ErinnerungId (Type-Safe EntityId)
   * @param tx - Optionale Transaktion
   * @returns Result<Erinnerung | null>
   */
  async findById(id: ErinnerungId, tx?: TransactionContext): Promise<Result<Erinnerung | null>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      const data = await client.erinnerung.findUnique({
        where: { id: id.toString() },
      });

      if (!data) {
        return Result.ok(null);
      }

      return Result.ok(PrismaErinnerungMapper.toDomain(data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to find Erinnerung: ${message}`);
    }
  }

  /**
   * Findet alle Erinnerungen eines Einsatzes.
   *
   * **Sortierung:**
   * - Nach faelligAm aufsteigend (nächste Fälligkeit zuerst)
   *
   * **Use Case (Story 1.1):**
   * - "die Erinnerung erscheint in meiner Liste"
   *
   * @param einsatzId - EinsatzId für die Filterung
   * @param tx - Optionale externe Transaktion
   * @returns Result<Erinnerung[]> - Liste der Erinnerungen
   */
  async findByEinsatzId(einsatzId: EinsatzId, tx?: TransactionContext): Promise<Result<Erinnerung[]>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;
      const data = await client.erinnerung.findMany({
        where: {
          einsatzId: einsatzId.toString(),
          // Soft-Delete Filter (Story 1.4) - nur nicht-gelöschte Erinnerungen
          isDeleted: false,
        },
        orderBy: { faelligAm: 'asc' },
      });

      const erinnerungen = data.map((item) => PrismaErinnerungMapper.toDomain(item));

      return Result.ok(erinnerungen);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to find Erinnerungen by EinsatzId: ${message}`);
    }
  }

  /**
   * Findet alle überfälligen Erinnerungen für die Eskalation.
   *
   * **Scope (Story 4.1/4.4):**
   * - Status: AUSGELOEST
   * - ausgeloestAm <= threshold
   * - Hotfix: Filtert Erinnerungen aus, die das Intensivierungs-Limit erreicht haben
   *   UND keine Eskalationsperson haben (diese würden nur Fehlermeldungen produzieren)
   *
   * @param threshold - Zeitgrenze ab der eine Erinnerung als überfällig gilt (now - timeout)
   * @param tx - Optional: Transaction Context
   */
  async findOverdue(threshold: Date, tx?: TransactionContext): Promise<Result<Erinnerung[]>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      // MAX_INTENSIVIERUNGEN aus der Entity referenzieren (zentrale Definition)
      const MAX_INTENSIVIERUNGEN = Erinnerung.MAX_INTENSIVIERUNGEN;

      const data = await client.erinnerung.findMany({
        where: {
          status: 'AUSGELOEST',
          ausgeloestAm: {
            lte: threshold,
          },
          // Soft-Delete Check
          isDeleted: false,
          // Nur Erinnerungen, die noch eskalierbar sind:
          // - ENTWEDER hat sie eine Eskalationsperson (→ echte Eskalation möglich)
          // - ODER sie hat das Intensivierungs-Limit noch nicht erreicht (→ Intensivierung möglich)
          OR: [{ eskalationsPersonId: { not: null } }, { intensivierungsCount: { lt: MAX_INTENSIVIERUNGEN } }],
        },
      });

      const erinnerungen = data.map((item) => PrismaErinnerungMapper.toDomain(item));
      return Result.ok(erinnerungen);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to find overdue Erinnerungen: ${message}`);
    }
  }

  /**
   * Prüft ob eine Erinnerung mit der gegebenen ID existiert.
   *
   * **Performance:**
   * - COUNT Query statt SELECT * (keine Row Materialization)
   * - Effizienter als findById wenn nur Existenz geprüft werden soll
   *
   * @param id - Die zu prüfende ErinnerungId
   * @returns Result<boolean> - true wenn Erinnerung existiert
   */
  async exists(id: ErinnerungId): Promise<Result<boolean>> {
    try {
      const count = await this.prisma.erinnerung.count({
        where: { id: id.toString() },
      });

      return Result.ok(count > 0);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to check Erinnerung existence: ${message}`);
    }
  }

  /**
   * Berechnet Statistiken für einen Einsatz.
   * Story 4.9: Escalation Statistics
   */
  async getStatistik(einsatzId: EinsatzId): Promise<Result<ErinnerungStatistik>> {
    try {
      // 1. Fetch escalated items
      const escalatedItems = await this.prisma.erinnerung.findMany({
        where: {
          einsatzId: einsatzId.toString(),
          wurdeEskaliert: true,
          isDeleted: false,
        },
        select: {
          ausgeloestAm: true,
          eskaliertAm: true,
          assignedToId: true,
        },
      });

      const totalEscalated = escalatedItems.length;

      // 2. Calculate Avg Time
      let totalTimeMs = 0;
      let timeCount = 0;

      for (const item of escalatedItems) {
        if (item.ausgeloestAm && item.eskaliertAm) {
          const diff = item.eskaliertAm.getTime() - item.ausgeloestAm.getTime();
          // Ignoriere negative Werte (sollte nicht passieren, aber sicher ist sicher)
          if (diff >= 0) {
            totalTimeMs += diff;
            timeCount++;
          }
        }
      }

      const avgEscalationTimeSeconds = timeCount > 0 ? totalTimeMs / timeCount / 1000 : 0;

      // 3. Calculate Top Receivers
      const receiverCounts = new Map<string, number>();
      for (const item of escalatedItems) {
        if (item.assignedToId) {
          const current = receiverCounts.get(item.assignedToId) || 0;
          receiverCounts.set(item.assignedToId, current + 1);
        }
      }

      const topReceivers = Array.from(receiverCounts.entries())
        .sort((a, b) => b[1] - a[1]) // Descending by count
        .slice(0, 3) // Top 3
        .map(([rawId, count]) => {
          // Wir erstellen UserId Objekte. Falls ungültig (was DB Konsistenz verhindern sollte),
          // loggen wir oder ignorieren. Hier nehmen wir an DB ist sauber.
          const userIdResult = UserId.create(rawId);
          // Fallback falls ID ungültig: SYSTEM oder Ignore
          return { userId: userIdResult.isSuccess ? userIdResult.value! : UserId.create('SYSTEM').value!, count };
        });

      // 4. Status Counts via groupBy
      const statusGroups = await this.prisma.erinnerung.groupBy({
        by: ['status'],
        _count: true,
        where: {
          einsatzId: einsatzId.toString(),
          isDeleted: false,
        },
      });

      const statusCounts: ErinnerungStatusCounts = {
        total: 0,
        geplant: 0,
        ausgeloest: 0,
        acknowledged: 0,
        snoozed: 0,
        eskaliert: 0,
        erledigt: 0,
      };

      for (const group of statusGroups) {
        const count = group._count;
        statusCounts.total += count;
        switch (group.status) {
          case 'GEPLANT':
            statusCounts.geplant = count;
            break;
          case 'AUSGELOEST':
            statusCounts.ausgeloest = count;
            break;
          case 'ACKNOWLEDGED':
            statusCounts.acknowledged = count;
            break;
          case 'SNOOZED':
            statusCounts.snoozed = count;
            break;
          case 'ESKALIERT':
            statusCounts.eskaliert = count;
            break;
          case 'ERLEDIGT':
            statusCounts.erledigt = count;
            break;
          default:
            this.logger.warn(`Unbekannter Erinnerungs-Status in Statistik: ${group.status}`);
            break;
        }
      }

      const activeCount = statusCounts.geplant + statusCounts.ausgeloest + statusCounts.acknowledged + statusCounts.snoozed + statusCounts.eskaliert;

      return Result.ok({
        totalEscalated,
        avgEscalationTimeSeconds,
        topReceivers,
        statusCounts,
        activeCount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to get statistics: ${message}`);
    }
  }

  /**
   * Berechnet Statistiken pro Person für einen Einsatz.
   * Story 9.2: Statistiken nach Person
   */
  async getPersonStatistik(einsatzId: EinsatzId): Promise<Result<PersonErinnerungStatistik>> {
    try {
      const einsatzIdStr = einsatzId.toString();

      // Alle nicht-gelöschten Erinnerungen des Einsatzes laden
      const erinnerungen = await this.prisma.erinnerung.findMany({
        where: {
          einsatzId: einsatzIdStr,
          isDeleted: false,
        },
        select: {
          assignedToId: true,
          acknowledgedBy: true,
          wurdeEskaliert: true,
          ausgeloestAm: true,
          acknowledgedAm: true,
        },
      });

      // Per userId aggregieren
      const personMap = new Map<string, { zugewiesen: number; acknowledged: number; eskalationen: number; reaktionszeitMs: number[] }>();

      for (const e of erinnerungen) {
        // Zuweisungen zählen
        if (e.assignedToId) {
          const entry = personMap.get(e.assignedToId) ?? { zugewiesen: 0, acknowledged: 0, eskalationen: 0, reaktionszeitMs: [] };
          entry.zugewiesen++;
          if (e.wurdeEskaliert) {
            // "Eskalationen empfangen": Zählt bei assignedToId, da nach Eskalation die Erinnerung dem Empfänger zugewiesen ist
            entry.eskalationen++;
          }
          personMap.set(e.assignedToId, entry);
        }

        // Acknowledges zählen
        if (e.acknowledgedBy) {
          const entry = personMap.get(e.acknowledgedBy) ?? { zugewiesen: 0, acknowledged: 0, eskalationen: 0, reaktionszeitMs: [] };
          // Acknowledged wird der Person zugerechnet, die tatsächlich bestätigt hat (kann von assignedTo abweichen bei Delegation)
          entry.acknowledged++;
          // Reaktionszeit berechnen
          if (e.ausgeloestAm && e.acknowledgedAm) {
            const diff = e.acknowledgedAm.getTime() - e.ausgeloestAm.getTime();
            if (diff >= 0) {
              entry.reaktionszeitMs.push(diff);
            }
          }
          personMap.set(e.acknowledgedBy, entry);
        }
      }

      // AC2: Alle aktiven Einsatz-Teilnehmer einbeziehen (auch ohne Erinnerungen)
      const teilnehmer = await this.prisma.einsatzTeilnehmer.findMany({
        where: { einsatzId: einsatzIdStr, leftAt: null },
        select: { userId: true },
      });

      for (const t of teilnehmer) {
        if (!personMap.has(t.userId)) {
          personMap.set(t.userId, { zugewiesen: 0, acknowledged: 0, eskalationen: 0, reaktionszeitMs: [] });
        }
      }

      // Map zu Array konvertieren
      const items = Array.from(personMap.entries()).map(([rawId, data]) => {
        const userIdResult = UserId.create(rawId);
        const userId = userIdResult.isSuccess ? userIdResult.value! : UserId.create('SYSTEM').value!;
        const avgReaktionszeitSeconds = data.reaktionszeitMs.length > 0 ? data.reaktionszeitMs.reduce((sum, val) => sum + val, 0) / data.reaktionszeitMs.length / 1000 : null;
        return {
          userId,
          zugewiesen: data.zugewiesen,
          acknowledged: data.acknowledged,
          eskalationen: data.eskalationen,
          avgReaktionszeitSeconds,
        };
      });

      return Result.ok({ items });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to get person statistics: ${message}`);
    }
  }

  /**
   * Berechnet Zeitverlauf-Statistiken für einen Einsatz (Story 9.3).
   */
  async getZeitverlaufStatistik(einsatzId: EinsatzId): Promise<Result<ZeitverlaufStatistik>> {
    try {
      const erinnerungen = await this.prisma.erinnerung.findMany({
        where: {
          einsatzId: einsatzId.toString(),
          isDeleted: false,
        },
        select: {
          createdAt: true,
          ausgeloestAm: true,
          escalatedAt: true,
        },
      });

      if (erinnerungen.length === 0) {
        return Result.ok({ intervalMinutes: 0, buckets: [] });
      }

      if (erinnerungen.length === 1) {
        const single = erinnerungen[0]!;
        const bucket: ZeitverlaufBucket = {
          timestamp: single.createdAt,
          erstellt: 1,
          ausgeloest: single.ausgeloestAm ? 1 : 0,
          eskaliert: single.escalatedAt ? 1 : 0,
        };
        return Result.ok({ intervalMinutes: 15, buckets: [bucket] });
      }

      // Einsatzdauer berechnen
      // biome-ignore lint/style/noNonNullAssertion: length > 1 is guaranteed by early return above
      let minTime = erinnerungen[0]!.createdAt.getTime();
      let maxTime = minTime;
      for (const e of erinnerungen) {
        const t = e.createdAt.getTime();
        if (t < minTime) minTime = t;
        if (t > maxTime) maxTime = t;
      }

      const durationMs = maxTime - minTime;
      const durationHours = durationMs / (1000 * 60 * 60);

      // Intervall wählen
      let intervalMinutes: number;
      if (durationHours < 2) {
        intervalMinutes = 15;
      } else if (durationHours < 8) {
        intervalMinutes = 30;
      } else if (durationHours < 24) {
        intervalMinutes = 60;
      } else {
        intervalMinutes = 240;
      }

      const intervalMs = intervalMinutes * 60 * 1000;

      // Bucket-Start berechnen (auf Intervall abrunden)
      const bucketStart = Math.floor(minTime / intervalMs) * intervalMs;
      const bucketEnd = Math.floor(maxTime / intervalMs) * intervalMs;

      // Alle Buckets initialisieren
      const bucketMap = new Map<number, ZeitverlaufBucket>();
      for (let ts = bucketStart; ts <= bucketEnd; ts += intervalMs) {
        bucketMap.set(ts, { timestamp: new Date(ts), erstellt: 0, ausgeloest: 0, eskaliert: 0 });
      }

      // Erinnerungen in Buckets einordnen
      for (const e of erinnerungen) {
        const createdBucket = Math.floor(e.createdAt.getTime() / intervalMs) * intervalMs;
        const bucket = bucketMap.get(createdBucket);
        if (bucket) bucket.erstellt++;

        if (e.ausgeloestAm) {
          const triggerBucket = Math.floor(e.ausgeloestAm.getTime() / intervalMs) * intervalMs;
          const tb = bucketMap.get(triggerBucket);
          if (tb) tb.ausgeloest++;
        }

        if (e.escalatedAt) {
          const escalationBucket = Math.floor(e.escalatedAt.getTime() / intervalMs) * intervalMs;
          const eb = bucketMap.get(escalationBucket);
          if (eb) eb.eskaliert++;
        }
      }

      // Aufsteigend sortieren
      const buckets = Array.from(bucketMap.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

      return Result.ok({ intervalMinutes, buckets });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to get zeitverlauf statistics: ${message}`);
    }
  }

  /**
   * Findet die aktive Kind-Instanz einer wiederkehrenden Parent-Erinnerung (Story 6.5 AC2).
   */
  async findActiveChildByParentId(parentId: ErinnerungId, tx?: TransactionContext): Promise<Result<Erinnerung | null>> {
    try {
      const client = (tx as PrismaClient | undefined) ?? this.prisma;

      const data = await client.erinnerung.findFirst({
        where: {
          parentErinnerungId: parentId.toString(),
          status: { in: ['GEPLANT', 'AUSGELOEST', 'SNOOZED', 'ACKNOWLEDGED', 'ESKALIERT'] },
          isDeleted: false,
        },
        orderBy: { faelligAm: 'asc' },
      });

      if (!data) {
        return Result.ok(null);
      }

      return Result.ok(PrismaErinnerungMapper.toDomain(data));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown database error';
      return Result.fail(`Failed to find active child: ${message}`);
    }
  }
}
