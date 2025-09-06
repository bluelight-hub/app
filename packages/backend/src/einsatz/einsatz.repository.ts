import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { Einsatz, EinsatzStatus, Prisma } from '@prisma/client';

@Injectable()
export class EinsatzRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Prisma.EinsatzCreateInput): Promise<Einsatz> {
    return this.prisma.einsatz.create({
      data,
    });
  }

  async findAll(params?: {
    skip?: number;
    take?: number;
    cursor?: Prisma.EinsatzWhereUniqueInput;
    where?: Prisma.EinsatzWhereInput;
    orderBy?: Prisma.EinsatzOrderByWithRelationInput | Prisma.EinsatzOrderByWithRelationInput[];
  }): Promise<Einsatz[]> {
    const { skip, take, cursor, where, orderBy } = params || {};

    return this.prisma.einsatz.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy: orderBy ?? { createdAt: 'desc' },
    });
  }

  async findOne(id: string): Promise<Einsatz | null> {
    return this.prisma.einsatz.findUnique({
      where: { id },
    });
  }

  async update(id: string, data: Prisma.EinsatzUpdateInput): Promise<Einsatz> {
    return this.prisma.einsatz.update({
      where: { id },
      data,
    });
  }

  async delete(id: string): Promise<Einsatz> {
    return this.prisma.einsatz.delete({
      where: { id },
    });
  }

  async findByStatus(status: EinsatzStatus): Promise<Einsatz[]> {
    return this.prisma.einsatz.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByCreator(userId: string): Promise<Einsatz[]> {
    return this.prisma.einsatz.findMany({
      where: { createdBy: userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async count(where?: Prisma.EinsatzWhereInput): Promise<number> {
    return this.prisma.einsatz.count({
      where,
    });
  }

  async findWithPagination(
    page: number = 1,
    limit: number = 10,
    where?: Prisma.EinsatzWhereInput,
    orderBy: Prisma.EinsatzOrderByWithRelationInput = { createdAt: 'desc' },
  ): Promise<{ items: Einsatz[]; total: number; page: number; limit: number; totalPages: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.einsatz.findMany({
        where,
        skip,
        take: limit,
        orderBy: orderBy,
      }),
      this.prisma.einsatz.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / Math.max(1, limit)),
    };
  }

  async countByStatus(includeArchived = false): Promise<{
    angelegt: number;
    inBearbeitung: number;
    abgeschlossen: number;
    archiviert: number;
  }> {
    const [angelegt, inBearbeitung, abgeschlossen, archiviert] = await Promise.all([
      this.prisma.einsatz.count({
        where: { status: 'ANGELEGT' },
      }),
      this.prisma.einsatz.count({
        where: { status: 'IN_BEARBEITUNG' },
      }),
      this.prisma.einsatz.count({
        where: { status: 'ABGESCHLOSSEN' },
      }),
      includeArchived ? this.prisma.einsatz.count({ where: { status: 'ARCHIVIERT' } }) : Promise.resolve(0),
    ]);

    return {
      angelegt,
      inBearbeitung,
      abgeschlossen,
      archiviert,
    };
  }

  async findPreviousId(createdAt: Date): Promise<string | null> {
    const result = await this.prisma.einsatz.findFirst({
      where: {
        createdAt: {
          lt: createdAt,
        },
        status: {
          not: EinsatzStatus.ARCHIVIERT,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
      },
    });
    return result?.id || null;
  }

  async findNextId(createdAt: Date): Promise<string | null> {
    const result = await this.prisma.einsatz.findFirst({
      where: {
        createdAt: {
          gt: createdAt,
        },
        status: {
          not: EinsatzStatus.ARCHIVIERT,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
      select: {
        id: true,
      },
    });
    return result?.id || null;
  }
}
