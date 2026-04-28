import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { Result } from '@domain/common/result';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { PsaProfilAktion } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import type { IPsaProfilQuittungRepository } from '@domain/eigenschutz/repositories/i-psa-profil-quittung.repository';
import type { PsaProfil } from '@/generated/prisma/enums';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PSA_PROFIL_QUITTUNG_REPOSITORY } from '@infrastructure/di-tokens';
import type { OffenePsaBekanntgabeEntryDto } from '../../dto/offene-psa-bekanntgabe-entry.dto';
import { ListOffenePsaBekanntgabenQuery } from './list-offene-psa-bekanntgaben.query';

/**
 * Default-Zeitfenster für offene Bekanntgaben (24h zurück) — Story 3.4 AC15.
 * Wird angewendet, wenn der Caller kein `seitISO` setzt.
 */
const DEFAULT_SEIT_DAUER_MS = 24 * 60 * 60 * 1000;

/**
 * DoS-Schutz für den Outbox-Read im Sender-View. 1000 ist eine konservative
 * Obergrenze für PSA-Events eines Einsatzes innerhalb von 24h — typisch ≪ 50.
 */
const MAX_OUTBOX_ROWS = 1000;

/**
 * Maximale Begründungs-Länge im Anriss (Story 3.4 AC15: erste 80 Zeichen).
 */
const BEGRUENDUNG_ANRISS_MAX_LENGTH = 80;

interface RawOutboxRow {
  payload: unknown;
  occurredAt: Date;
}

interface PsaGeaendertPayload {
  einsatzId: string;
  einheitId: string;
  propagationGroupId: string;
  profil: PsaProfil;
  aktion: PsaProfilAktion;
  begruendung: string;
}

interface AggregatedGroup {
  propagationGroupId: string;
  occurredAt: Date;
  begruendung: string;
  einheitIds: Set<string>;
  toggles: Map<string, { profil: PsaProfil; aktion: PsaProfilAktion }>;
}

/**
 * Handler für `ListOffenePsaBekanntgabenQuery` (Story 3.4 AC15).
 *
 * **Lookup-Strategie:**
 * 1. **Outbox-Lookup mit `seit`-Filter:** Alle
 *    `eigenschutz.psa_profil_geaendert`-Events des Einsatzes ab `seitISO`
 *    (Default `now() - 24h`).
 * 2. **In-Memory-Gruppierung nach `propagationGroupId`:** Pro Gruppe
 *    aggregieren wir Älteste-`occurredAt`, eine Begründung (erste,
 *    deterministisch über `occurredAt ASC`), distincte `einheitId`s und
 *    distincte `(profil, aktion)`-Toggles.
 * 3. **Quittungs-Stand pro Gruppe laden:**
 *    `IPsaProfilQuittungRepository.findByEinsatzAndGroup` — `ackCount` =
 *    Anzahl distincter `einheitId`s in der Quittungs-Tabelle, `totalCount`
 *    = Größe des erwarteten Empfänger-Sets.
 * 4. **Filter `status !== 'complete'`:** Vollständig quittierte Gruppen
 *    verschwinden aus der Liste (UX-Spec „Banner verschwindet").
 * 5. **Sortierung DESC nach `occurredAt`:** Neueste Bekanntgabe zuerst.
 */
@Injectable()
@QueryHandler(ListOffenePsaBekanntgabenQuery)
export class ListOffenePsaBekanntgabenHandler implements IQueryHandler<ListOffenePsaBekanntgabenQuery, Result<OffenePsaBekanntgabeEntryDto[]>> {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(PSA_PROFIL_QUITTUNG_REPOSITORY)
    private readonly quittungRepo: IPsaProfilQuittungRepository,
  ) {}

  async execute(query: ListOffenePsaBekanntgabenQuery): Promise<Result<OffenePsaBekanntgabeEntryDto[]>> {
    const seitDate = this.resolveSeit(query.seitISO);

    // Step 1 — Outbox-Lookup mit DB-seitigem `einsatzId`-Filter via Prisma
    // JSON-Path (Postgres JSONB). Wir lesen NIEMALS Events anderer Einsätze
    // — sonst würde das Sender-View bei vielen parallelen Einsätzen die
    // gesamte Outbox scannen. Plus expliziter `take`-Cap als DoS-Schutz
    // (typisch ≪ MAX_OUTBOX_ROWS pro 24h-Fenster pro Einsatz).
    const rows = (await this.prisma.outboxEvent.findMany({
      where: {
        eventName: PsaProfilGeaendertEvent.eventName(),
        occurredAt: { gte: seitDate },
        payload: { path: ['einsatzId'], equals: query.einsatzId },
      },
      orderBy: [{ occurredAt: 'asc' }, { id: 'asc' }],
      select: { payload: true, occurredAt: true },
      take: MAX_OUTBOX_ROWS,
    })) as RawOutboxRow[];

    // Step 2 — In-Memory-Gruppierung nach propagationGroupId.
    const grouped = new Map<string, AggregatedGroup>();
    for (const row of rows) {
      const payload = this.parsePayload(row.payload);
      if (!payload) continue;
      if (payload.einsatzId !== query.einsatzId) continue;

      let group = grouped.get(payload.propagationGroupId);
      if (!group) {
        group = {
          propagationGroupId: payload.propagationGroupId,
          occurredAt: row.occurredAt,
          begruendung: payload.begruendung,
          einheitIds: new Set<string>(),
          toggles: new Map<string, { profil: PsaProfil; aktion: PsaProfilAktion }>(),
        };
        grouped.set(payload.propagationGroupId, group);
      }
      // `occurredAt asc` Sortierung im SQL-Query stellt sicher, dass das
      // älteste Event die Gruppe initialisiert — Begründung und occurredAt
      // bleiben deterministisch.
      group.einheitIds.add(payload.einheitId);
      const toggleKey = `${payload.profil}:${payload.aktion}`;
      if (!group.toggles.has(toggleKey)) {
        group.toggles.set(toggleKey, { profil: payload.profil, aktion: payload.aktion });
      }
    }

    if (grouped.size === 0) {
      return Result.ok([]);
    }

    // Step 3 — Quittungs-Stand pro Gruppe laden + Filter `status !== 'complete'`.
    const entries: OffenePsaBekanntgabeEntryDto[] = [];
    for (const group of grouped.values()) {
      const quittungenResult = await this.quittungRepo.findByEinsatzAndGroup(query.einsatzId, group.propagationGroupId);
      if (quittungenResult.isFailure) {
        return Result.fail<OffenePsaBekanntgabeEntryDto[]>(quittungenResult.error ?? 'PSA-Quittungen konnten nicht geladen werden');
      }
      const ackEinheitIds = new Set<string>();
      for (const row of quittungenResult.value ?? []) {
        ackEinheitIds.add(row.einheitId);
      }

      const totalCount = group.einheitIds.size;
      const ackCount = [...group.einheitIds].filter((id) => ackEinheitIds.has(id)).length;

      // Status-Ableitung — `complete` wird ausgefiltert.
      let status: 'pending' | 'partial' | 'complete';
      if (totalCount === 0 || ackCount === 0) {
        status = 'pending';
      } else if (ackCount < totalCount) {
        status = 'partial';
      } else {
        status = 'complete';
      }

      if (status === 'complete') {
        continue;
      }

      entries.push({
        propagationGroupId: group.propagationGroupId,
        occurredAt: group.occurredAt.toISOString(),
        begruendungAnriss: this.buildBegruendungAnriss(group.begruendung),
        profilToggles: [...group.toggles.values()],
        betroffeneEinheitIds: [...group.einheitIds],
        ackCount,
        totalCount,
        status,
      });
    }

    // Step 5 — Sortierung DESC nach occurredAt (neueste zuerst).
    entries.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return Result.ok(entries);
  }

  private resolveSeit(seitISO?: string): Date {
    if (seitISO) {
      const parsed = new Date(seitISO);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date(Date.now() - DEFAULT_SEIT_DAUER_MS);
  }

  private parsePayload(payload: unknown): PsaGeaendertPayload | null {
    if (!payload || typeof payload !== 'object') return null;
    const p = payload as Record<string, unknown>;
    if (typeof p.einsatzId !== 'string') return null;
    if (typeof p.einheitId !== 'string') return null;
    if (typeof p.propagationGroupId !== 'string') return null;
    if (typeof p.profil !== 'string') return null;
    if (typeof p.aktion !== 'string') return null;
    return {
      einsatzId: p.einsatzId,
      einheitId: p.einheitId,
      propagationGroupId: p.propagationGroupId,
      profil: p.profil as PsaProfil,
      aktion: p.aktion as PsaProfilAktion,
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
