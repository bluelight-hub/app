import { Injectable } from '@nestjs/common';
import type { INotizRepository } from '@domain/notiz/repositories/i-notiz.repository';
import type { Notiz } from '@domain/notiz/entities/notiz.entity';
import type { NotizId } from '@domain/notiz/value-objects/notiz-id';
// biome-ignore lint/style/useImportType: Injectable class needs runtime symbol for NestJS DI
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaNotizMapper } from './mappers/prisma-notiz.mapper';

/**
 * Prisma Repository Implementierung fuer Notizen.
 */
@Injectable()
export class PrismaNotizRepository implements INotizRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(notiz: Notiz, tx?: unknown): Promise<void> {
    const data = PrismaNotizMapper.toPersistence(notiz);
    const client = (tx ?? this.prisma) as typeof this.prisma;

    await client.notiz.upsert({
      where: { id: data.id },
      create: {
        id: data.id,
        einsatzId: data.einsatzId,
        titel: data.titel,
        inhalt: data.inhalt,
        kategorie: data.kategorie,
        istTeamsichtbar: data.istTeamsichtbar,
        erstelltVon: data.erstelltVon,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        isDeleted: data.isDeleted,
        deletedAt: data.deletedAt,
        deletedBy: data.deletedBy,
      },
      update: {
        updatedAt: data.updatedAt,
        titel: data.titel,
        inhalt: data.inhalt,
        kategorie: data.kategorie,
        istTeamsichtbar: data.istTeamsichtbar,
        isDeleted: data.isDeleted,
        deletedAt: data.deletedAt,
        deletedBy: data.deletedBy,
      },
    });
  }

  async findById(id: NotizId, tx?: unknown): Promise<Notiz | null> {
    const client = (tx ?? this.prisma) as typeof this.prisma;
    const record = await client.notiz.findUnique({
      where: { id: id.toString() },
    });

    if (!record) return null;
    return PrismaNotizMapper.toDomain(record);
  }

  async findByEinsatzId(einsatzId: string, userId: string, tx?: unknown): Promise<Notiz[]> {
    const client = (tx ?? this.prisma) as typeof this.prisma;
    const records = await client.notiz.findMany({
      where: {
        einsatzId,
        isDeleted: false,
        OR: [{ erstelltVon: userId }, { istTeamsichtbar: true }],
      },
      orderBy: { createdAt: 'desc' },
    });

    return records.map((record) => PrismaNotizMapper.toDomain(record));
  }
}
