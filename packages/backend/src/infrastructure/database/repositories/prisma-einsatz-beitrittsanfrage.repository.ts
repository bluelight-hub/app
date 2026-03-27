import { Injectable } from '@nestjs/common';
import type { IEinsatzBeitrittsanfrageRepository, EinsatzBeitrittsanfrageData } from '@domain/repositories/i-einsatz-beitrittsanfrage.repository';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { TransactionContext } from '@domain/common/transaction';
import type { BeitrittsanfrageStatus } from '@/generated/prisma/client';

@Injectable()
export class PrismaEinsatzBeitrittsanfrageRepository implements IEinsatzBeitrittsanfrageRepository {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: TransactionContext) {
    return (tx as typeof this.prisma) ?? this.prisma;
  }

  async save(data: { einsatzId: string; userId: string }, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData> {
    const client = this.getClient(tx);
    return client.einsatzBeitrittsanfrage.create({
      data: { einsatzId: data.einsatzId, userId: data.userId },
    });
  }

  async findById(id: string): Promise<EinsatzBeitrittsanfrageData | null> {
    return this.prisma.einsatzBeitrittsanfrage.findUnique({ where: { id } });
  }

  async findOpenByEinsatzAndUser(einsatzId: string, userId: string): Promise<EinsatzBeitrittsanfrageData | null> {
    return this.prisma.einsatzBeitrittsanfrage.findFirst({
      where: { einsatzId, userId, status: 'OFFEN' },
    });
  }

  async findByEinsatz(einsatzId: string, status?: string): Promise<EinsatzBeitrittsanfrageData[]> {
    return this.prisma.einsatzBeitrittsanfrage.findMany({
      where: { einsatzId, ...(status ? { status: status as BeitrittsanfrageStatus } : {}) },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(id: string, decision: string, resolvedBy: string, tx?: TransactionContext): Promise<EinsatzBeitrittsanfrageData> {
    const client = this.getClient(tx);
    return client.einsatzBeitrittsanfrage.update({
      where: { id },
      data: { status: decision as BeitrittsanfrageStatus, resolvedAt: new Date(), resolvedBy },
    });
  }
}
