import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IPsaProfilQuittungRepository } from '@domain/eigenschutz/repositories/i-psa-profil-quittung.repository';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { KRAEFTE_REPOSITORIES, PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import { PsaQuittungEntryDto } from '../../dto/psa-quittung-entry.dto';
import { ListPsaQuittungenQuery } from './list-psa-quittungen.query';

/**
 * Handler für `ListPsaQuittungenQuery` (Story 3.4 AC8).
 *
 * **Lookup-Strategie:**
 * 1. **Erwartete Empfänger aus Outbox laden:** `eigenschutz.psa_profil_geaendert`-
 *    Events mit gegebener `propagationGroupId` UND `einsatzId` werden über
 *    Prisma JSON-Path-Filter direkt aus der DB geladen — kein nachträglicher
 *    JS-Filter über die ganze Outbox-Tabelle. Distinct `payload.einheitId`s
 *    ergeben das erwartete Empfänger-Set. Begründung: Es gibt keine separate
 *    „Bekanntgabe-Gruppen"-Tabelle (Architektur §B5).
 * 2. **Quittungen laden:** Aus `IPsaProfilQuittungRepository.findByEinsatzAndGroup`
 *    — Cross-Einsatz-Schutz wird im Repository sichergestellt.
 * 3. **Einheits-Namen anreichern:** Ein einziger `findByEinsatzId`-Call statt
 *    N×`findById` (Spec AC8/Task 5 verlangt Batch-Lookup).
 * 4. **Status ableiten:** Pro Empfänger `QUITTIERT` (Quittung vorhanden)
 *    oder `AUSSTEHEND`. `OVERDUE` ist Story 3.7.
 */
@Injectable()
@QueryHandler(ListPsaQuittungenQuery)
export class ListPsaQuittungenHandler implements IQueryHandler<ListPsaQuittungenQuery, Result<PsaQuittungEntryDto[]>> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PSA_PROFIL_QUITTUNG_REPOSITORY)
    private readonly quittungRepo: IPsaProfilQuittungRepository,
    @Inject(KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT)
    private readonly einheitRepo: IEinsatzEinheitRepository,
  ) {}

  async execute(query: ListPsaQuittungenQuery): Promise<Result<PsaQuittungEntryDto[]>> {
    // Step 1 — Erwartete Empfänger aus Outbox.
    const expectedEinheitIds = await this.loadExpectedEinheitIds(query.einsatzId, query.propagationGroupId);

    if (expectedEinheitIds.length === 0) {
      // Kein erwarteter Empfänger → leere Liste, kein Fehler. Aufrufer
      // (Frontend-Hook) entscheidet, ob das ein UI-relevanter Sonderfall ist.
      return Result.ok([]);
    }

    // Step 2 — Quittungen laden (Cross-Einsatz-Schutz im Repo).
    const quittungenResult = await this.quittungRepo.findByEinsatzAndGroup(query.einsatzId, query.propagationGroupId);
    if (quittungenResult.isFailure) {
      return Result.fail<PsaQuittungEntryDto[]>(quittungenResult.error ?? 'PSA-Quittungen konnten nicht geladen werden');
    }
    const quittungenByEinheit = new Map<string, { quittiertAm: Date; quittiertVonUserId: string; lueckeGemeldet: boolean; lueckeNotiz: string | null }>();
    for (const row of quittungenResult.value ?? []) {
      quittungenByEinheit.set(row.einheitId, {
        quittiertAm: row.quittiertAm,
        quittiertVonUserId: row.quittiertVonUserId,
        lueckeGemeldet: row.lueckeGemeldet,
        lueckeNotiz: row.lueckeNotiz,
      });
    }

    // Step 3 — Einheits-Namen via Batch-Lookup (Spec AC8/Task 5 verlangt
    // Batch — `findByEinsatzId` ist ein einziger DB-Roundtrip statt N×findById).
    // Bei Repo-Failure brechen wir explizit ab, statt rohe CUIDs als Namen
    // auszuliefern.
    const einheitenResult = await this.einheitRepo.findByEinsatzId(query.einsatzId);
    if (einheitenResult.isFailure) {
      return Result.fail<PsaQuittungEntryDto[]>(einheitenResult.error ?? 'Einheiten konnten nicht geladen werden');
    }
    const einheitNameById = new Map<string, string>();
    for (const einheit of einheitenResult.value ?? []) {
      einheitNameById.set(einheit.id.value, einheit.name);
    }

    // Step 4 — Pro Empfänger Status ableiten + Namen anreichern.
    const entries: PsaQuittungEntryDto[] = [];
    for (const einheitId of expectedEinheitIds) {
      const quittung = quittungenByEinheit.get(einheitId);
      // Einheit kann zwischenzeitlich gelöscht worden sein → lokalisierter
      // Platzhalter statt rohem CUID2 in der UI.
      const einheitName = einheitNameById.get(einheitId) ?? 'Einheit nicht verfügbar';

      if (quittung) {
        entries.push({
          einheitId,
          einheitName,
          status: 'QUITTIERT',
          quittiertAm: quittung.quittiertAm.toISOString(),
          quittiertVonUserId: quittung.quittiertVonUserId,
          // Story 3.6 AC8 — Lücke-Marker durchreichen.
          lueckeGemeldet: quittung.lueckeGemeldet,
          ...(quittung.lueckeNotiz !== null ? { lueckeNotiz: quittung.lueckeNotiz } : {}),
        });
      } else {
        entries.push({
          einheitId,
          einheitName,
          status: 'AUSSTEHEND',
          lueckeGemeldet: false,
        });
      }
    }

    return Result.ok(entries);
  }

  /**
   * Liest distincte `einheitId`s aus den `PsaProfilGeaendert`-Events der
   * Bekanntgabe-Gruppe. Filter `propagationGroupId` UND `einsatzId` läuft
   * direkt in der DB via Prisma JSON-Path (Postgres JSONB) — kein
   * Full-Table-Scan über alle PSA-Events. Reihenfolge: ältestes Event
   * zuerst (`occurredAt ASC`), damit der erste Empfänger oben in der
   * UI-Liste erscheint.
   */
  private async loadExpectedEinheitIds(einsatzId: string, propagationGroupId: string): Promise<string[]> {
    const rows = await this.prisma.outboxEvent.findMany({
      where: {
        eventName: PsaProfilGeaendertEvent.eventName(),
        AND: [{ payload: { path: ['propagationGroupId'], equals: propagationGroupId } }, { payload: { path: ['einsatzId'], equals: einsatzId } }],
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: { payload: true },
    });

    const seen = new Set<string>();
    const ordered: string[] = [];
    for (const row of rows) {
      const payload = row.payload as { einheitId?: unknown } | null;
      if (!payload) continue;
      if (typeof payload.einheitId !== 'string') continue;
      if (seen.has(payload.einheitId)) continue;
      seen.add(payload.einheitId);
      ordered.push(payload.einheitId);
    }
    return ordered;
  }
}
