import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EtbStatus, EtbKategorie } from '@prisma/client';

@Injectable()
export class EtbRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { einsatzId: string; status: EtbStatus; createdBy: string }) {
    return this.prisma.einsatztagebuch.create({
      data: {
        einsatzId: data.einsatzId,
        status: data.status,
        createdBy: data.createdBy,
      },
      include: {
        einsatz: true,
        creator: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async findById(id: string) {
    return this.prisma.einsatztagebuch.findUnique({
      where: { id },
    });
  }

  async findByEinsatzId(einsatzId: string) {
    return this.prisma.einsatztagebuch.findUnique({
      where: { einsatzId },
    });
  }

  async findByEinsatzIdWithEntries(einsatzId: string, limit?: number, offset?: number) {
    return this.prisma.einsatztagebuch.findUnique({
      where: { einsatzId },
      include: {
        einsatz: true,
        eintraege: {
          where: {
            deletedAt: null,
          },
          orderBy: [{ timestamp: 'asc' }, { sequenceNumber: 'asc' }],
          take: limit,
          skip: offset,
          include: {
            creator: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async getNextSequenceNumber(etbId: string): Promise<number> {
    // Use transaction to prevent race conditions
    return await this.prisma.$transaction(async (tx) => {
      const lastEntry = await tx.etbEintrag.findFirst({
        where: { etbId },
        orderBy: { sequenceNumber: 'desc' },
      });
      return lastEntry ? lastEntry.sequenceNumber + 1 : 1;
    });
  }

  async createEintrag(data: { etbId: string; timestamp: Date; sequenceNumber: number; kategorie: EtbKategorie; text: string; createdBy: string; version: number }) {
    return this.prisma.etbEintrag.create({
      data: {
        etbId: data.etbId,
        timestamp: data.timestamp,
        sequenceNumber: data.sequenceNumber,
        kategorie: data.kategorie,
        text: data.text,
        createdBy: data.createdBy,
        version: data.version,
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async findEintragById(id: string) {
    return this.prisma.etbEintrag.findUnique({
      where: { id },
    });
  }

  async createEintragHistory(data: { eintragId: string; version: number; timestamp: Date; sequenceNumber: number; kategorie: EtbKategorie; text: string; changeReason: string; changedBy: string }) {
    return this.prisma.etbEintragHistorie.create({
      data: {
        eintragId: data.eintragId,
        version: data.version,
        timestamp: data.timestamp,
        sequenceNumber: data.sequenceNumber,
        kategorie: data.kategorie,
        text: data.text,
        changeReason: data.changeReason,
        changedBy: data.changedBy,
      },
    });
  }

  async updateEintrag(
    id: string,
    data: {
      timestamp?: Date;
      kategorie?: EtbKategorie;
      text?: string;
      version: number;
      updatedBy: string;
      changeReason?: string;
    },
  ) {
    const updateData = {
      version: data.version,
      updatedBy: data.updatedBy,
      updatedAt: new Date(),
      ...(data.timestamp && { timestamp: data.timestamp }),
      ...(data.kategorie && { kategorie: data.kategorie }),
      ...(data.text && { text: data.text }),
    };

    return this.prisma.etbEintrag.update({
      where: { id },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  async softDeleteEintrag(id: string, deletedBy: string) {
    return this.prisma.etbEintrag.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        deletedBy,
      },
    });
  }

  async findAllTextbausteine() {
    return this.prisma.etbTextbaustein.findMany({
      orderBy: [{ kategorie: 'asc' }, { kurztext: 'asc' }],
    });
  }
}
