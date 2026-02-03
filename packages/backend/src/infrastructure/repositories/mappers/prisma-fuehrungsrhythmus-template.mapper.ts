import type { FuehrungsrhythmusTemplate as PrismaFuehrungsrhythmusTemplate, FuehrungsrhythmusEintrag as PrismaFuehrungsrhythmusEintrag } from '@/generated/prisma/client';
import { FuehrungsrhythmusTemplate } from '@domain/fuehrungsrhythmus/entities/fuehrungsrhythmus-template.entity';
import { FuehrungsrhythmusTemplateId } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-id';
import { FuehrungsrhythmusTemplateName } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-template-name';
import { FuehrungsrhythmusEintrag } from '@domain/fuehrungsrhythmus/value-objects/fuehrungsrhythmus-eintrag';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Prisma DB Record mit inkludierten Eintraegen.
 */
type PrismaFuehrungsrhythmusTemplateWithEintraege = PrismaFuehrungsrhythmusTemplate & {
  eintraege: PrismaFuehrungsrhythmusEintrag[];
};

/**
 * Mapper zwischen Prisma Model und Domain Entity fuer FuehrungsrhythmusTemplate.
 */
export class PrismaFuehrungsrhythmusTemplateMapper {
  /**
   * Konvertiert Prisma Model (mit inkludierten Eintraegen) zu Domain Entity.
   */
  static toDomain(raw: PrismaFuehrungsrhythmusTemplateWithEintraege): FuehrungsrhythmusTemplate {
    const idResult = FuehrungsrhythmusTemplateId.create(raw.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Invalid FuehrungsrhythmusTemplateId: ${raw.id}`);
    }

    const nameResult = FuehrungsrhythmusTemplateName.create(raw.name);
    if (nameResult.isFailure || !nameResult.value) {
      throw new Error(`Invalid FuehrungsrhythmusTemplateName: ${raw.name}`);
    }

    const createdByResult = UserId.create(raw.createdBy);
    if (createdByResult.isFailure || !createdByResult.value) {
      throw new Error(`Invalid createdBy UserId: ${raw.createdBy}`);
    }

    let deletedBy: UserId | null = null;
    if (raw.deletedBy) {
      const deletedByResult = UserId.create(raw.deletedBy);
      if (deletedByResult.isSuccess && deletedByResult.value) {
        deletedBy = deletedByResult.value as UserId;
      }
    }

    // Eintraege aus Prisma-Daten rekonstruieren
    const eintraege = raw.eintraege.map((eintrag) => {
      const eintragResult = FuehrungsrhythmusEintrag.create({
        id: eintrag.id,
        titel: eintrag.titel,
        intervallMinuten: eintrag.intervallMinuten,
        offsetMinuten: eintrag.offsetMinuten,
        sortOrder: eintrag.sortOrder,
      });
      if (eintragResult.isFailure || !eintragResult.value) {
        throw new Error(`Invalid FuehrungsrhythmusEintrag: ${eintrag.id}`);
      }
      return eintragResult.value;
    });

    return FuehrungsrhythmusTemplate.reconstruct({
      id: idResult.value as FuehrungsrhythmusTemplateId,
      name: nameResult.value,
      beschreibung: raw.beschreibung,
      eintraege,
      createdBy: createdByResult.value as UserId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
      deletedAt: raw.deletedAt,
      deletedBy,
    });
  }

  /**
   * Konvertiert Domain Entity zu Prisma-kompatiblen Objekten.
   * Gibt Template-Daten und Eintraege-Daten separat zurueck.
   */
  static toPersistence(template: FuehrungsrhythmusTemplate) {
    return {
      template: {
        id: template.id.toString(),
        name: template.name.value,
        beschreibung: template.beschreibung,
        createdBy: template.createdBy.toString(),
        isDeleted: template.isDeleted,
        deletedAt: template.deletedAt,
        deletedBy: template.deletedBy?.toString() ?? null,
      },
      eintraege: template.eintraege.map((eintrag) => ({
        id: eintrag.id,
        fuehrungsrhythmusTemplateId: template.id.toString(),
        titel: eintrag.titel,
        intervallMinuten: eintrag.intervallMinuten,
        offsetMinuten: eintrag.offsetMinuten,
        sortOrder: eintrag.sortOrder,
      })),
    };
  }
}
