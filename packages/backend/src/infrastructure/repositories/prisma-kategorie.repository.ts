import { Injectable } from '@nestjs/common';
import type { IKategorieRepository } from '@domain/kategorie/repositories/i-kategorie.repository';
import type { Kategorie } from '@domain/kategorie/entities/kategorie.entity';
import type { KategorieId } from '@domain/kategorie/value-objects/kategorie-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaKategorieMapper } from './mappers/prisma-kategorie.mapper';

/**
 * Prisma Repository Implementierung fuer Kategorien.
 */
@Injectable()
export class PrismaKategorieRepository implements IKategorieRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(kategorie: Kategorie, tx?: unknown): Promise<void> {
    const data = PrismaKategorieMapper.toPersistence(kategorie);
    const client = (tx ?? this.prisma) as typeof this.prisma;

    await client.kategorie.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        name: data.name,
        farbe: data.farbe,
        einsatzId: data.einsatzId,
        erstelltVon: data.erstelltVon,
        geloeschtAm: data.geloeschtAm,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      },
      update: {
        updatedAt: data.updatedAt,
        geloeschtAm: data.geloeschtAm,
      },
    });
  }

  async findById(id: KategorieId, tx?: unknown): Promise<Kategorie | null> {
    const client = (tx ?? this.prisma) as typeof this.prisma;
    const record = await client.kategorie.findUnique({
      where: { id: id.toString() },
    });

    if (!record) return null;
    return PrismaKategorieMapper.toDomain(record);
  }

  async findByEinsatzId(einsatzId: string): Promise<Kategorie[]> {
    const records = await this.prisma.kategorie.findMany({
      where: {
        einsatzId,
        geloeschtAm: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => PrismaKategorieMapper.toDomain(record));
  }

  async existsByNameAndEinsatzId(name: string, einsatzId: string): Promise<boolean> {
    const record = await this.prisma.kategorie.findFirst({
      where: {
        name,
        einsatzId,
        geloeschtAm: null,
      },
    });

    return record !== null;
  }

  async delete(kategorie: Kategorie, tx?: unknown): Promise<void> {
    // Soft-delete: Entity hat bereits geloeschtAm gesetzt
    await this.save(kategorie, tx);
  }
}
