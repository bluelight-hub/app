import type { FunkkanalAggregate } from '@domain/aggregates/funkkanal/funkkanal.aggregate';
import type { FunkkanalZuordnung } from '@domain/aggregates/funkkanal/funkkanal-zuordnung.entity';
import type { FunkkanalResponseDto, ZuordnungResponseDto } from '@/application/funkkanal/dto';

/**
 * Statischer Mapper: Funkkanal-Aggregat → Response-DTO.
 *
 * Projeziert Domain-Werte (Value Objects, Entity-Felder) auf ein serialisierbares
 * POJO. Bleibt bewusst im `modules`-Layer — die DTOs gehören zur HTTP-API.
 */
export const FunkkanalMapper = {
  toZuordnungDto(zuordnung: FunkkanalZuordnung): ZuordnungResponseDto {
    const kraft = zuordnung.kraftRef;
    return {
      id: zuordnung.id.value,
      kanalId: zuordnung.kanalId.value,
      kraftKind: kraft.kind,
      fahrzeugId: kraft.kind === 'fahrzeug' ? kraft.fahrzeugId : null,
      personId: kraft.kind === 'person' ? kraft.personId : null,
      einheitId: kraft.kind === 'einheit' ? kraft.einheitId : null,
      rufnameSnapshot: zuordnung.rufnameSnapshot,
      rolle: zuordnung.rolle,
      createdAt: zuordnung.createdAt,
    };
  },

  toResponseDto(aggregate: FunkkanalAggregate): FunkkanalResponseDto {
    const kanal = aggregate.kanal;
    return {
      id: kanal.id.value,
      einsatzId: kanal.einsatzId.value,
      name: kanal.name,
      details: { ...kanal.details },
      status: kanal.status,
      zweck: kanal.zweck ?? null,
      sortIndex: kanal.sortIndex,
      zuordnungen: aggregate.zuordnungen.map((z) => FunkkanalMapper.toZuordnungDto(z)),
      createdAt: kanal.createdAt,
      updatedAt: kanal.updatedAt,
      createdBy: kanal.createdBy ?? null,
      updatedBy: kanal.updatedBy ?? null,
    };
  },
};
