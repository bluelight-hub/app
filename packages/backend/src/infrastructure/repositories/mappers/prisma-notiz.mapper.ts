import type { Notiz as PrismaNotiz } from '@/generated/prisma/client';
import { Notiz } from '@domain/notiz/entities/notiz.entity';
import { NotizId } from '@domain/notiz/value-objects/notiz-id';
import { NotizTitel } from '@domain/notiz/value-objects/notiz-titel';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Mapper zwischen Prisma Model und Domain Entity fuer Notiz.
 * Static Methods (kein DI) - konsistent mit PrismaErinnerungsvorlageMapper.
 */
export class PrismaNotizMapper {
  /**
   * Konvertiert ein Prisma Model zu einer Domain Entity.
   */
  static toDomain(prismaNotiz: PrismaNotiz): Notiz {
    const idResult = NotizId.create(prismaNotiz.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Ungueltige NotizId: ${prismaNotiz.id}`);
    }

    const titelResult = NotizTitel.create(prismaNotiz.titel);
    if (titelResult.isFailure || !titelResult.value) {
      throw new Error(`Ungueltiger NotizTitel: ${prismaNotiz.titel}`);
    }

    const erstelltVonResult = UserId.create(prismaNotiz.erstelltVon);
    if (erstelltVonResult.isFailure || !erstelltVonResult.value) {
      throw new Error(`Ungueltige ErstelltVon UserId: ${prismaNotiz.erstelltVon}`);
    }

    let deletedBy: UserId | null = null;
    if (prismaNotiz.deletedBy) {
      const deletedByResult = UserId.create(prismaNotiz.deletedBy);
      if (deletedByResult.isSuccess && deletedByResult.value) {
        deletedBy = deletedByResult.value as UserId;
      }
    }

    return Notiz.reconstruct({
      id: idResult.value as NotizId,
      einsatzId: prismaNotiz.einsatzId,
      titel: titelResult.value,
      inhalt: prismaNotiz.inhalt,
      kategorie: prismaNotiz.kategorie,
      kategorieId: prismaNotiz.kategorieId, // Story 8.2
      istTeamsichtbar: prismaNotiz.istTeamsichtbar,
      erstelltVon: erstelltVonResult.value as UserId,
      createdAt: prismaNotiz.createdAt,
      updatedAt: prismaNotiz.updatedAt,
      isDeleted: prismaNotiz.isDeleted,
      deletedAt: prismaNotiz.deletedAt,
      deletedBy,
    });
  }

  /**
   * Konvertiert eine Domain Entity zu Prisma-kompatiblen Daten.
   */
  static toPersistence(notiz: Notiz): {
    id: string;
    einsatzId: string;
    titel: string;
    inhalt: string | null;
    kategorie: string | null;
    kategorieId: string | null; // Story 8.2
    istTeamsichtbar: boolean;
    erstelltVon: string;
    isDeleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt: Date | null;
    deletedBy: string | null;
  } {
    return {
      id: notiz.id.toString(),
      einsatzId: notiz.einsatzId,
      titel: notiz.titel.value,
      inhalt: notiz.inhalt,
      kategorie: notiz.kategorie,
      kategorieId: notiz.kategorieId, // Story 8.2
      istTeamsichtbar: notiz.istTeamsichtbar,
      erstelltVon: notiz.erstelltVon.toString(),
      createdAt: notiz.createdAt,
      updatedAt: notiz.updatedAt,
      isDeleted: notiz.isDeleted,
      deletedAt: notiz.deletedAt,
      deletedBy: notiz.deletedBy?.toString() ?? null,
    };
  }
}
