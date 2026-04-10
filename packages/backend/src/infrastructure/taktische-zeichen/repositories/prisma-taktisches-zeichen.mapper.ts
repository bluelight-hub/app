import { Prisma, type TaktischesZeichen as PrismaTaktischesZeichen } from '@/generated/prisma/client';
import { TaktischesZeichen } from '@domain/taktische-zeichen/aggregates/taktisches-zeichen.aggregate';
import { TaktischesZeichenId } from '@domain/taktische-zeichen/value-objects/taktisches-zeichen-id';
import { ZeichenDefinition } from '@domain/taktische-zeichen/value-objects/zeichen-definition.vo';

export class PrismaTaktischesZeichenMapper {
  static toDomain(data: PrismaTaktischesZeichen): TaktischesZeichen {
    const idResult = TaktischesZeichenId.create(data.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Ungültige TaktischesZeichen-ID in DB: ${data.id}`);
    }

    const defResult = ZeichenDefinition.fromJson(data.zeichenDefinition as Record<string, unknown>);
    if (defResult.isFailure || !defResult.value) {
      throw new Error(`Ungültige ZeichenDefinition in DB für ID ${data.id}`);
    }

    return TaktischesZeichen.reconstitute({
      id: idResult.value as TaktischesZeichenId,
      einsatzId: data.einsatzId,
      zeichenDefinition: defResult.value,
      referenzTyp: data.referenzTyp ?? undefined,
      referenzId: data.referenzId ?? undefined,
      lat: data.lat ?? undefined,
      lng: data.lng ?? undefined,
      mgrs: data.mgrs ?? undefined,
      lagekarteId: data.lagekarteId ?? undefined,
      label: data.label ?? undefined,
      notiz: data.notiz ?? undefined,
      istAusKatalog: data.istAusKatalog,
      katalogEintragId: data.katalogEintragId ?? undefined,
      createdAt: data.createdAt,
      createdBy: data.createdBy,
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy ?? undefined,
    });
  }

  static toPersistence(zeichen: TaktischesZeichen) {
    return {
      id: zeichen.id.value,
      einsatzId: zeichen.einsatzId,
      zeichenDefinition: zeichen.zeichenDefinition.toJson() as unknown as Prisma.InputJsonValue,
      referenzTyp: zeichen.referenzTyp ?? null,
      referenzId: zeichen.referenzId ?? null,
      lat: zeichen.lat ?? null,
      lng: zeichen.lng ?? null,
      mgrs: zeichen.mgrs ?? null,
      lagekarteId: zeichen.lagekarteId ?? null,
      label: zeichen.label ?? null,
      notiz: zeichen.notiz ?? null,
      istAusKatalog: zeichen.istAusKatalog,
      katalogEintragId: zeichen.katalogEintragId ?? null,
      createdBy: zeichen.createdBy,
      updatedBy: zeichen.updatedBy ?? null,
    };
  }
}
