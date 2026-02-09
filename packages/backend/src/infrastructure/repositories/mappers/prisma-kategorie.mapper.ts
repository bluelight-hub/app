import type { Kategorie as PrismaKategorie } from '@/generated/prisma/client';
import { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { KategorieName } from '@domain/kategorie/value-objects/kategorie-name';
import { KategorieFarbe } from '@domain/kategorie/value-objects/kategorie-farbe';
import { UserId } from '@domain/value-objects/user-id';

/**
 * Mapper zwischen Prisma Model und Domain Entity fuer Kategorie.
 * Static Methods (kein DI) - konsistent mit PrismaNotizMapper.
 */
export class PrismaKategorieMapper {
  /**
   * Konvertiert ein Prisma Model zu einer Domain Entity.
   */
  static toDomain(prismaKategorie: PrismaKategorie): Kategorie {
    const idResult = KategorieId.create(prismaKategorie.id);
    if (idResult.isFailure || !idResult.value) {
      throw new Error(`Ungueltige KategorieId: ${prismaKategorie.id}`);
    }

    const nameResult = KategorieName.create(prismaKategorie.name);
    if (nameResult.isFailure || !nameResult.value) {
      throw new Error(`Ungueltiger KategorieName: ${prismaKategorie.name}`);
    }

    const farbeResult = KategorieFarbe.create(prismaKategorie.farbe);
    if (farbeResult.isFailure || !farbeResult.value) {
      throw new Error(`Ungueltige KategorieFarbe: ${prismaKategorie.farbe}`);
    }

    const erstelltVonResult = UserId.create(prismaKategorie.erstelltVon);
    if (erstelltVonResult.isFailure || !erstelltVonResult.value) {
      throw new Error(`Ungueltige ErstelltVon UserId: ${prismaKategorie.erstelltVon}`);
    }

    // Parse geloeschtVon if present
    let geloeschtVon: UserId | null = null;
    if (prismaKategorie.geloeschtVon) {
      const geloeschtVonResult = UserId.create(prismaKategorie.geloeschtVon);
      if (geloeschtVonResult.isFailure || !geloeschtVonResult.value) {
        throw new Error(`Ungueltige GeloeschtVon UserId: ${prismaKategorie.geloeschtVon}`);
      }
      geloeschtVon = geloeschtVonResult.value as UserId;
    }

    return Kategorie.reconstruct({
      id: idResult.value as KategorieId,
      einsatzId: prismaKategorie.einsatzId,
      name: nameResult.value,
      farbe: farbeResult.value,
      erstelltVon: erstelltVonResult.value as UserId,
      createdAt: prismaKategorie.createdAt,
      updatedAt: prismaKategorie.updatedAt,
      geloeschtAm: prismaKategorie.geloeschtAm,
      geloeschtVon,
    });
  }

  /**
   * Konvertiert eine Domain Entity zu Prisma-kompatiblen Daten.
   */
  static toPersistence(kategorie: Kategorie): {
    id: string;
    name: string;
    farbe: string;
    einsatzId: string;
    erstelltVon: string;
    geloeschtAm: Date | null;
    geloeschtVon: string | null;
    createdAt: Date;
    updatedAt: Date;
  } {
    return {
      id: kategorie.id.toString(),
      name: kategorie.name.value,
      farbe: kategorie.farbe.value,
      einsatzId: kategorie.einsatzId,
      erstelltVon: kategorie.erstelltVon.toString(),
      geloeschtAm: kategorie.geloeschtAm,
      geloeschtVon: kategorie.geloeschtVon?.toString() ?? null,
      createdAt: kategorie.createdAt,
      updatedAt: kategorie.updatedAt,
    };
  }
}
