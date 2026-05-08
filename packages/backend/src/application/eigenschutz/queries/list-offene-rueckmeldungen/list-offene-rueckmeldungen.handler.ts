import { Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { OffeneRueckmeldungDto } from '../../dto/offene-rueckmeldung.dto';
import { ListOffeneRueckmeldungenQuery } from './list-offene-rueckmeldungen.query';

const MAX_RUECKMELDUNGEN = 200;
const MAX_OUTBOX_ROWS = 1000;
const BEGRUENDUNG_ANRISS_MAX_LENGTH = 80;

interface RawRueckmeldungRow {
  id: string;
  propagationGroupId: string;
  einsatzId: string;
  einheitId: string;
  lueckeNotiz: string | null;
  quittiertAm: Date;
}

interface RawOutboxRow {
  payload: unknown;
}

interface PsaGeaendertPayload {
  einsatzId: string;
  propagationGroupId: string;
  begruendung: string;
}

@Injectable()
@QueryHandler(ListOffeneRueckmeldungenQuery)
export class ListOffeneRueckmeldungenHandler implements IQueryHandler<ListOffeneRueckmeldungenQuery, Result<OffeneRueckmeldungDto[]>> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: ListOffeneRueckmeldungenQuery): Promise<Result<OffeneRueckmeldungDto[]>> {
    try {
      const rows = (await this.prisma.psaProfilQuittung.findMany({
        where: { einsatzId: query.einsatzId, lueckeGemeldet: true },
        orderBy: [{ quittiertAm: 'desc' }, { id: 'asc' }],
        select: {
          id: true,
          propagationGroupId: true,
          einsatzId: true,
          einheitId: true,
          lueckeNotiz: true,
          quittiertAm: true,
        },
        take: MAX_RUECKMELDUNGEN,
      })) as RawRueckmeldungRow[];

      if (rows.length === 0) {
        return Result.ok([]);
      }

      const begruendungByGroup = await this.loadBegruendungAnrisse(query.einsatzId, new Set(rows.map((row) => row.propagationGroupId)));

      return Result.ok(
        rows.map((row) => ({
          propagationGroupId: row.propagationGroupId,
          einsatzId: row.einsatzId,
          einheitId: row.einheitId,
          lueckeNotiz: row.lueckeNotiz,
          gemeldetAm: row.quittiertAm.toISOString(),
          begruendungAnriss: begruendungByGroup.get(row.propagationGroupId) ?? null,
        })),
      );
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Unbekannter Datenbankfehler';
      return Result.fail<OffeneRueckmeldungDto[]>(`InfrastructureError:OffeneRueckmeldungen:${raw}`);
    }
  }

  private async loadBegruendungAnrisse(einsatzId: string, propagationGroupIds: ReadonlySet<string>): Promise<Map<string, string>> {
    const groupFilters = [...propagationGroupIds].map((propagationGroupId) => ({ payload: { path: ['propagationGroupId'], equals: propagationGroupId } }));
    const rows = (await this.prisma.outboxEvent.findMany({
      where: {
        eventName: PsaProfilGeaendertEvent.eventName(),
        AND: [{ payload: { path: ['einsatzId'], equals: einsatzId } }, { OR: groupFilters }],
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: { payload: true },
      take: MAX_OUTBOX_ROWS,
    })) as RawOutboxRow[];

    const result = new Map<string, string>();
    for (const row of rows) {
      const payload = this.parsePayload(row.payload);
      if (!payload) continue;
      if (payload.einsatzId !== einsatzId) continue;
      if (!propagationGroupIds.has(payload.propagationGroupId)) continue;
      if (result.has(payload.propagationGroupId)) continue;
      result.set(payload.propagationGroupId, this.buildBegruendungAnriss(payload.begruendung));
    }
    return result;
  }

  private parsePayload(payload: unknown): PsaGeaendertPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    if (typeof p.einsatzId !== 'string') return null;
    if (typeof p.propagationGroupId !== 'string') return null;
    return {
      einsatzId: p.einsatzId,
      propagationGroupId: p.propagationGroupId,
      begruendung: typeof p.begruendung === 'string' ? p.begruendung : '',
    };
  }

  private buildBegruendungAnriss(begruendung: string): string {
    const trimmed = begruendung.trim();
    if (trimmed.length <= BEGRUENDUNG_ANRISS_MAX_LENGTH) {
      return trimmed;
    }
    return `${trimmed.slice(0, BEGRUENDUNG_ANRISS_MAX_LENGTH - 1).trimEnd()}…`;
  }
}
