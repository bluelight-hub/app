import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import type { AlarmierungEmpfaengerResponseDto, AlarmierungResponseDto } from '@/application/alarmierung/dto';
import type { AlarmierungTimelineEventDto } from '@/application/alarmierung/dto/alarmierung-timeline-event.dto';
import type { AlarmierungTimelineItem } from '@/application/alarmierung/queries/get-alarmierung-timeline/get-alarmierung-timeline.handler';

/**
 * Statischer Mapper: Alarmierungs-Aggregat → Response-DTO.
 *
 * Projeziert Domain-Werte (Value Objects, Entity-Felder) auf serialisierbare
 * POJOs. Bleibt bewusst im `modules`-Layer — die DTOs gehören zur HTTP-API.
 */
export const AlarmierungMapper = {
  toEmpfaengerDto(empfaenger: AlarmierungEmpfaenger): AlarmierungEmpfaengerResponseDto {
    const ref = empfaenger.ref;
    return {
      id: empfaenger.id.value,
      kind: ref.kind,
      fahrzeugId: ref.kind === 'fahrzeug' ? ref.fahrzeugId : null,
      personId: ref.kind === 'person' ? ref.personId : null,
      einheitId: ref.kind === 'einheit' ? ref.einheitId : null,
      nameSnapshot: empfaenger.nameSnapshot,
      alarmiertAm: empfaenger.alarmiertAm,
      ausgeruecktAm: empfaenger.ausgeruecktAm,
      vorOrtAm: empfaenger.vorOrtAm,
      wiederFreiAm: empfaenger.wiederFreiAm,
      letzterFmsStatus: empfaenger.letzterFmsStatus,
      reaktionszeitSekunden: empfaenger.reaktionszeitSekunden,
    };
  },

  toResponseDto(aggregate: AlarmierungAggregate): AlarmierungResponseDto {
    const a = aggregate.alarmierung;
    return {
      id: a.id.value,
      einsatzId: a.einsatzId.value,
      bezeichnung: a.bezeichnung,
      beschreibung: a.beschreibung ?? null,
      status: a.status,
      alarmierungszeit: a.alarmierungszeit,
      ursprungAlarmierungId: a.ursprungAlarmierungId?.value ?? null,
      istNachalarmierung: aggregate.istNachalarmierung,
      empfaenger: aggregate.empfaenger.map((e) => AlarmierungMapper.toEmpfaengerDto(e)),
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      createdBy: a.createdBy ?? null,
      updatedBy: a.updatedBy ?? null,
    };
  },

  toTimelineEventDto(item: AlarmierungTimelineItem): AlarmierungTimelineEventDto {
    return {
      type: item.type,
      occurredAt: item.occurredAt,
      data: {
        alarmierungId: item.data.alarmierungId ?? null,
        bezeichnung: item.data.bezeichnung ?? null,
        empfaengerId: item.data.empfaengerId ?? null,
        nameSnapshot: item.data.nameSnapshot ?? null,
        eintragId: item.data.eintragId ?? null,
        text: item.data.text ?? null,
        absender: item.data.absender ?? null,
      },
    };
  },
};
