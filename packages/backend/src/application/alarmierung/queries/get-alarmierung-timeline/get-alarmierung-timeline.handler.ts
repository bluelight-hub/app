import { Inject, Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import type { IAlarmierungRepository } from '@domain/repositories/i-alarmierung.repository';
import type { IEtbRepository } from '@domain/repositories/i-etb.repository';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { ALARMIERUNG_REPOSITORY, ETB_REPOSITORY } from '@infrastructure/di-tokens';
import type { AlarmierungTimelineEventType } from '../../dto/alarmierung-timeline-event.dto';
import type { GetAlarmierungTimelineQuery } from './get-alarmierung-timeline.query';

/**
 * Interner Timeline-Eintrag (Domain-nahe Form).
 *
 * Wird vom Controller / Mapper in
 * {@link AlarmierungTimelineEventDto} überführt.
 */
export interface AlarmierungTimelineItem {
  readonly type: AlarmierungTimelineEventType;
  readonly occurredAt: Date;
  readonly data: {
    alarmierungId?: string;
    bezeichnung?: string;
    empfaengerId?: string;
    nameSnapshot?: string;
    eintragId?: string;
    text?: string;
    absender?: string;
  };
}

/**
 * Handler für {@link GetAlarmierungTimelineQuery}.
 *
 * Bildet die Timeline aus zwei Quellen:
 * 1. Strukturierte Empfänger-Zeitpunkte aus dem Alarmierungs-Aggregat
 *    (alarmiertAm, ausgeruecktAm, vorOrtAm, wiederFreiAm).
 * 2. ETB-Einträge mit Kategorie `ALARMIERUNG` für den Einsatz.
 *
 * Sortierung: chronologisch ASC. Stabilität bei gleichem Timestamp ist
 * implementation-defined — wichtig ist nur die plausible Anzeigereihenfolge.
 */
@Injectable()
export class GetAlarmierungTimelineQueryHandler {
  constructor(
    @Inject(ALARMIERUNG_REPOSITORY) private readonly alarmierungRepository: IAlarmierungRepository,
    @Inject(ETB_REPOSITORY) private readonly etbRepository: IEtbRepository,
  ) {}

  async execute(query: GetAlarmierungTimelineQuery): Promise<Result<AlarmierungTimelineItem[]>> {
    const einsatzIdResult = EinsatzId.create(query.einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return Result.fail<AlarmierungTimelineItem[]>(einsatzIdResult.error ?? 'Ungültige EinsatzId');
    }
    const einsatzId = einsatzIdResult.value;

    let aggregates: AlarmierungAggregate[];
    if (query.alarmierungId) {
      const idResult = AlarmierungId.create(query.alarmierungId);
      if (idResult.isFailure || !idResult.value) {
        return Result.fail<AlarmierungTimelineItem[]>(idResult.error ?? 'Ungültige AlarmierungId');
      }
      const single = await this.alarmierungRepository.findById(idResult.value);
      if (!single) {
        return Result.fail<AlarmierungTimelineItem[]>('Alarmierung nicht gefunden');
      }
      if (single.einsatzId.value !== einsatzId.value) {
        return Result.fail<AlarmierungTimelineItem[]>('Alarmierung gehört nicht zum angegebenen Einsatz');
      }
      aggregates = [single];
    } else {
      aggregates = await this.alarmierungRepository.findByEinsatzId(einsatzId);
    }

    const items: AlarmierungTimelineItem[] = [];

    for (const aggregate of aggregates) {
      items.push({
        type: 'alarmierung_ausgeloest',
        occurredAt: aggregate.alarmierungszeit,
        data: {
          alarmierungId: aggregate.id.value,
          bezeichnung: aggregate.bezeichnung,
        },
      });
      for (const empfaenger of aggregate.empfaenger) {
        items.push(...buildEmpfaengerItems(aggregate.id.value, empfaenger));
      }
    }

    // ETB-Einträge mit Kategorie ALARMIERUNG ergänzen.
    // TODO(#408-wave2): ETB-Abfrage auf gefilterte Query (kategorie=ALARMIERUNG) umstellen,
    // statt das komplette Aggregat zu laden — relevant sobald ETBs viele Einträge tragen.
    const etb = await this.etbRepository.findByEinsatzId(einsatzId);
    if (etb) {
      for (const eintrag of etb.eintraege) {
        if (eintrag.isDeleted) continue;
        if (eintrag.kategorie.value !== 'ALARMIERUNG') continue;
        items.push({
          type: 'etb_eintrag',
          occurredAt: eintrag.ereignisZeitpunkt,
          data: {
            eintragId: eintrag.id.value,
            text: eintrag.text,
            absender: eintrag.absender,
          },
        });
      }
    }

    items.sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
    return Result.ok<AlarmierungTimelineItem[]>(items);
  }
}

function buildEmpfaengerItems(alarmierungId: string, empfaenger: AlarmierungEmpfaenger): AlarmierungTimelineItem[] {
  const items: AlarmierungTimelineItem[] = [];
  const baseData = {
    alarmierungId,
    empfaengerId: empfaenger.id.value,
    nameSnapshot: empfaenger.nameSnapshot,
  };

  items.push({ type: 'empfaenger_alarmiert', occurredAt: empfaenger.alarmiertAm, data: baseData });

  if (empfaenger.ausgeruecktAm) {
    items.push({ type: 'empfaenger_ausgerueckt', occurredAt: empfaenger.ausgeruecktAm, data: baseData });
  }
  if (empfaenger.vorOrtAm) {
    items.push({ type: 'empfaenger_vor_ort', occurredAt: empfaenger.vorOrtAm, data: baseData });
  }
  if (empfaenger.wiederFreiAm) {
    items.push({ type: 'empfaenger_wieder_frei', occurredAt: empfaenger.wiederFreiAm, data: baseData });
  }

  return items;
}
