import { Inject, Injectable } from '@nestjs/common';
import type { Prisma } from '@/generated/prisma/client';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import { Result } from '@domain/common/result';
import { EVENT_NAMES } from '@domain/events/event-names';
import type { AmpelProjectionReadRow, AmpelProjectionUpsertRow, IAmpelProjectionRepository, RecalculateAmpelProjectionParams } from '@domain/eigenschutz/repositories';
import { AmpelStatusBerechnungService } from '@domain/eigenschutz/services/ampel-status-berechnung.service';
import { AmpelWarnBadgeService } from '@domain/eigenschutz/services/ampel-warn-badge.service';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';

type PrismaTransactionClient = Prisma.TransactionClient;
type JsonRecord = Record<string, unknown>;

@Injectable()
export class PrismaAmpelProjectionRepository implements IAmpelProjectionRepository {
  private readonly statusBerechnung = new AmpelStatusBerechnungService();
  private readonly warnBadgeService = new AmpelWarnBadgeService();

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async upsert(row: AmpelProjectionUpsertRow, tx?: TransactionContext): Promise<Result<AmpelProjectionReadRow>> {
    const client = this.client(tx);
    try {
      const persisted = await client.ampelProjection.upsert({
        where: { einsatzId_einheitId: { einsatzId: row.einsatzId, einheitId: row.einheitId } },
        create: row,
        update: {
          status: row.status,
          aktivePsaProfile: row.aktivePsaProfile,
          offeneGefaehrdungenHoch: row.offeneGefaehrdungenHoch,
          ausstehendePsaQuittungen: row.ausstehendePsaQuittungen,
          ausstehendeRegelQuittungen: row.ausstehendeRegelQuittungen,
          offeneVorfaelle: row.offeneVorfaelle,
          ungeloesteRueckmeldungen: row.ungeloesteRueckmeldungen,
          letzteAenderungAm: row.letzteAenderungAm,
          letzteAenderungVonUserId: row.letzteAenderungVonUserId,
        },
      });

      return Result.ok(this.toReadRow(persisted));
    } catch (error) {
      this.logError('AmpelProjection-Upsert fehlgeschlagen', error, row.einsatzId, row.einheitId);
      return Result.fail<AmpelProjectionReadRow>(this.wrapInfrastructureError(error));
    }
  }

  async findByEinsatz(einsatzId: string, tx?: TransactionContext): Promise<Result<AmpelProjectionReadRow[]>> {
    const client = this.client(tx);
    try {
      const rows = await client.ampelProjection.findMany({
        where: { einsatzId },
        orderBy: [{ letzteAenderungAm: 'desc' }, { einheitId: 'asc' }],
      });
      return Result.ok(rows.map((row) => this.toReadRow(row)));
    } catch (error) {
      this.logError('AmpelProjection-Liste fehlgeschlagen', error, einsatzId);
      return Result.fail<AmpelProjectionReadRow[]>(this.wrapInfrastructureError(error));
    }
  }

  async recalculateForEinheit(params: RecalculateAmpelProjectionParams, tx?: TransactionContext): Promise<Result<AmpelProjectionReadRow>> {
    const client = this.client(tx);
    try {
      const [aktivePsaProfile, offeneGefaehrdungenHoch, ausstehendePsaQuittungen, ausstehendeRegelQuittungen, offeneVorfaelle, ungeloesteRueckmeldungen] = await Promise.all([
        this.loadAktivePsaProfile(client, params.einsatzId, params.einheitId),
        this.countOffeneGefaehrdungenHoch(client, params.einsatzId, params.einheitId),
        this.countAusstehendePsaQuittungen(client, params.einsatzId, params.einheitId),
        this.countAusstehendeRegelQuittungen(client, params.einsatzId, params.einheitId),
        client.eigenschutzVorfall.count({ where: { einsatzId: params.einsatzId, einheitId: params.einheitId } }),
        client.psaProfilQuittung.count({ where: { einsatzId: params.einsatzId, einheitId: params.einheitId, lueckeGemeldet: true } }),
      ]);

      const statusResult = this.statusBerechnung.berechneStatus({
        offeneGefaehrdungenHoch,
        ausstehendePsaQuittungen,
        ausstehendeRegelQuittungen,
        offeneVorfaelle,
        ungeloesteRueckmeldungen,
      });
      if (statusResult.isFailure || statusResult.value === undefined) {
        return Result.fail<AmpelProjectionReadRow>(statusResult.error ?? 'ValidationFailed:AmpelStatus:unknown');
      }

      return this.upsert(
        {
          einsatzId: params.einsatzId,
          einheitId: params.einheitId,
          status: statusResult.value,
          aktivePsaProfile,
          offeneGefaehrdungenHoch,
          ausstehendePsaQuittungen,
          ausstehendeRegelQuittungen,
          offeneVorfaelle,
          ungeloesteRueckmeldungen,
          letzteAenderungAm: params.letzteAenderungAm,
          letzteAenderungVonUserId: params.letzteAenderungVonUserId,
        },
        tx,
      );
    } catch (error) {
      this.logError('AmpelProjection-Recompute fehlgeschlagen', error, params.einsatzId, params.einheitId);
      return Result.fail<AmpelProjectionReadRow>(this.wrapInfrastructureError(error));
    }
  }

  private async loadAktivePsaProfile(client: PrismaService | PrismaTransactionClient, einsatzId: string, einheitId: string): Promise<AmpelProjectionReadRow['aktivePsaProfile']> {
    const rows = await client.psaProfilZuweisung.findMany({
      where: { einsatzId, einheitId, gueltigBis: null },
      select: { profil: true },
      orderBy: [{ profil: 'asc' }],
    });
    return rows.map((row) => row.profil);
  }

  private async countOffeneGefaehrdungenHoch(client: PrismaService | PrismaTransactionClient, einsatzId: string, einheitId: string): Promise<number> {
    const row = await client.gefaehrdungsbeurteilung.findUnique({
      where: { einsatzId_einheitId: { einsatzId, einheitId } },
      select: { items: true },
    });
    if (!row || !Array.isArray(row.items)) return 0;
    return row.items.filter((item) => this.isOffeneHoheGefaehrdung(item)).length;
  }

  private async countAusstehendePsaQuittungen(client: PrismaService | PrismaTransactionClient, einsatzId: string, einheitId: string): Promise<number> {
    const events = await client.outboxEvent.findMany({
      where: {
        eventName: EVENT_NAMES.EIGENSCHUTZ.PSA_PROFIL_GEAENDERT,
        AND: [{ payload: { path: ['payload', 'einsatzId'], equals: einsatzId } }, { payload: { path: ['payload', 'einheitId'], equals: einheitId } }],
      },
      select: { payload: true },
    });
    const propagationGroups = new Set<string>();
    for (const event of events) {
      const serialized = this.asRecord(event.payload);
      const payload = this.asRecord(serialized.payload);
      if (payload.einsatzId === einsatzId && payload.einheitId === einheitId && typeof payload.propagationGroupId === 'string') {
        propagationGroups.add(payload.propagationGroupId);
      }
    }
    if (propagationGroups.size === 0) return 0;

    const antworten = await client.psaProfilQuittung.findMany({
      where: { einsatzId, einheitId, propagationGroupId: { in: [...propagationGroups] } },
      select: { propagationGroupId: true },
    });
    for (const antwort of antworten) {
      propagationGroups.delete(antwort.propagationGroupId);
    }
    return propagationGroups.size;
  }

  private async countAusstehendeRegelQuittungen(client: PrismaService | PrismaTransactionClient, einsatzId: string, einheitId: string): Promise<number> {
    const regeln = await client.sicherheitsregel.findMany({
      where: {
        einsatzId,
        OR: [{ einheitId }, { einheitId: null }],
        versionen: { some: { gueltigBis: null } },
      },
      select: { id: true },
    });
    if (regeln.length === 0) return 0;

    const regelIds = regeln.map((regel) => regel.id);
    const quittungen = await client.sicherheitsregelQuittung.findMany({
      where: { einheitId, regelId: { in: regelIds } },
      select: { regelId: true },
    });
    const quittierteRegelIds = new Set(quittungen.map((quittung) => quittung.regelId));
    return regelIds.filter((regelId) => !quittierteRegelIds.has(regelId)).length;
  }

  private isOffeneHoheGefaehrdung(item: unknown): boolean {
    const record = this.asRecord(item);
    return this.warnBadgeService.isGefaehrdungOhneSchutzmassnahme({
      risikoklasse: record.risikoklasse,
      schutzmassnahmen: record.schutzmassnahmen,
    });
  }

  private asRecord(value: unknown): JsonRecord {
    return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
  }

  private client(tx?: TransactionContext): PrismaService | PrismaTransactionClient {
    return (tx as PrismaTransactionClient | undefined) ?? this.prisma;
  }

  private toReadRow(row: AmpelProjectionReadRow): AmpelProjectionReadRow {
    return {
      einsatzId: row.einsatzId,
      einheitId: row.einheitId,
      status: row.status,
      aktivePsaProfile: row.aktivePsaProfile,
      offeneGefaehrdungenHoch: row.offeneGefaehrdungenHoch,
      ausstehendePsaQuittungen: row.ausstehendePsaQuittungen,
      ausstehendeRegelQuittungen: row.ausstehendeRegelQuittungen,
      offeneVorfaelle: row.offeneVorfaelle,
      ungeloesteRueckmeldungen: row.ungeloesteRueckmeldungen,
      letzteAenderungAm: row.letzteAenderungAm,
      letzteAenderungVonUserId: row.letzteAenderungVonUserId,
    };
  }

  private wrapInfrastructureError(error: unknown): string {
    const category = error instanceof Error ? error.name : 'Unknown';
    return `InfrastructureError:AmpelProjection:${category}`;
  }

  private logError(message: string, error: unknown, einsatzId: string, einheitId?: string): void {
    this.logger.error(message, {
      einsatzId,
      ...(einheitId !== undefined ? { einheitId } : {}),
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
