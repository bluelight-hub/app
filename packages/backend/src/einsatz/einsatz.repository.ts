import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import type { Einsatz, EinsatzStatus, Prisma } from '@prisma/client';

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
    orderBy?: Prisma.EinsatzOrderByWithRelationInput;
  }): Promise<Einsatz[]> {
    const { skip, take, cursor, where, orderBy } = params || {};

    return this.prisma.einsatz.findMany({
      skip,
      take,
      cursor,
      where,
      orderBy: orderBy || { createdAt: 'desc' },
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

  async findWithPagination(page: number = 1, limit: number = 10, where?: Prisma.EinsatzWhereInput): Promise<{ items: Einsatz[]; total: number; page: number; limit: number }> {
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.einsatz.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.einsatz.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }
}
