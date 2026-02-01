import type { Erinnerungsvorlage as PrismaErinnerungsvorlage } from '@/generated/prisma/client';
import { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { ErinnerungsvorlageTitel } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-titel';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Mapper zwischen Prisma Model und Domain Entity für Erinnerungsvorlagen.
 */
export class PrismaErinnerungsvorlageMapper {
  /**
   * Konvertiert Prisma Model zu Domain Entity.
   */
  static toDomain(raw: PrismaErinnerungsvorlage): Erinnerungsvorlage {
    const idResult = ErinnerungsvorlageId.create(raw.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Invalid ErinnerungsvorlageId: ${raw.id}`);
    }

    const titelResult = ErinnerungsvorlageTitel.create(raw.titel);
    if (titelResult.isFailure || !titelResult.value) {
      throw new Error(`Invalid ErinnerungsvorlageTitel: ${raw.titel}`);
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

    return Erinnerungsvorlage.reconstruct({
      id: idResult.value as ErinnerungsvorlageId,
      titel: titelResult.value,
      minuten: raw.minuten,
      beschreibung: raw.beschreibung,
      createdBy: createdByResult.value as UserId,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      isDeleted: raw.isDeleted,
      deletedAt: raw.deletedAt,
      deletedBy,
    });
  }

  /**
   * Konvertiert Domain Entity zu Prisma-kompatiblem Objekt für Create/Update.
   */
  static toPersistence(vorlage: Erinnerungsvorlage) {
    return {
      id: vorlage.id.toString(),
      titel: vorlage.titel.value,
      minuten: vorlage.minuten,
      beschreibung: vorlage.beschreibung,
      createdBy: vorlage.createdBy.toString(),
      isDeleted: vorlage.isDeleted,
      deletedAt: vorlage.deletedAt,
      deletedBy: vorlage.deletedBy?.toString() ?? null,
    };
  }
}
