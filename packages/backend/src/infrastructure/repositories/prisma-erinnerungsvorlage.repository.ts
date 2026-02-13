import { Injectable } from '@nestjs/common';
import type { IErinnerungsvorlageRepository } from '@domain/erinnerungsvorlage/repositories/i-erinnerungsvorlage.repository';
import type { Erinnerungsvorlage } from '@domain/erinnerungsvorlage/entities/erinnerungsvorlage.entity';
import type { ErinnerungsvorlageId } from '@domain/erinnerungsvorlage/value-objects/erinnerungsvorlage-id';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { PrismaErinnerungsvorlageMapper } from './mappers/prisma-erinnerungsvorlage.mapper';

/**
 * Prisma-basierte Implementierung des Erinnerungsvorlage Repository.
 */
@Injectable()
export class PrismaErinnerungsvorlageRepository implements IErinnerungsvorlageRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(vorlage: Erinnerungsvorlage): Promise<void> {
    const data = PrismaErinnerungsvorlageMapper.toPersistence(vorlage);

    await this.prisma.erinnerungsvorlage.upsert({
      where: { id: data.id },
      create: data,
      update: data,
    });
  }

  async findById(id: ErinnerungsvorlageId): Promise<Erinnerungsvorlage | null> {
    const raw = await this.prisma.erinnerungsvorlage.findUnique({
      where: { id: id.toString() },
    });

    if (!raw) return null;
    return PrismaErinnerungsvorlageMapper.toDomain(raw);
  }

  async findAll(): Promise<Erinnerungsvorlage[]> {
    const vorlagen = await this.prisma.erinnerungsvorlage.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
    });

    return vorlagen.map(PrismaErinnerungsvorlageMapper.toDomain);
  }

  async exists(id: ErinnerungsvorlageId): Promise<boolean> {
    const count = await this.prisma.erinnerungsvorlage.count({
      where: { id: id.toString(), isDeleted: false },
    });
    return count > 0;
  }
}
