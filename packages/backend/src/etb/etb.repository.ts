import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { EtbKategorie, EtbStatus, Prisma } from '@prisma/client';

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

  async findByEinsatzIdWithEntries(einsatzId: string, limit?: number, offset?: number, sortBy: string = 'timestamp', sortOrder: 'asc' | 'desc' = 'desc', includeDeleted: boolean = false) {
    // Mapping der erlaubten Sortierfelder
    const sortFieldMap: Record<string, { [key: string]: 'asc' | 'desc' }> = {
      timestamp: { timestamp: sortOrder },
      sequenceNumber: { sequenceNumber: sortOrder },
      kategorie: { kategorie: sortOrder },
      text: { text: sortOrder },
    };

    // Fallback auf timestamp wenn ungültiges Feld
    const primarySort = sortFieldMap[sortBy] || { timestamp: sortOrder };
    // Sekundäre Sortierung für Stabilität
    const secondarySort = sortBy !== 'sequenceNumber' ? { sequenceNumber: sortOrder } : { timestamp: sortOrder };

    // Bedingtes Filtering für gelöschte Einträge
    const whereClause = includeDeleted ? {} : { deletedAt: null };

    return this.prisma.einsatztagebuch.findUnique({
      where: { einsatzId },
      include: {
        einsatz: true,
        eintraege: {
          where: whereClause,
          orderBy: [primarySort, secondarySort],
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
            deleter: {
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

  async countEintraege(etbId: string, includeDeleted: boolean = false): Promise<number> {
    const whereClause = includeDeleted ? { etbId } : { etbId, deletedAt: null };
    return this.prisma.etbEintrag.count({
      where: whereClause,
    });
  }

  /**
   * Atomically allocates a sequence number and creates an ETB entry
   * This prevents race conditions when multiple entries are created concurrently
   */
  async createEintragAtomic(data: {
    etbId: string;
    timestamp: Date;
    kategorie: EtbKategorie;
    text: string;
    createdBy: string;
    version: number;
    funkrufname?: string;
    standort?: string;
    isAutomatic?: boolean;
    metadata?: Record<string, unknown>;
  }) {
    return this.prisma.$transaction(
      async (tx) => {
        // Get the next sequence number within the transaction
        const lastEntry = await tx.etbEintrag.findFirst({
          where: { etbId: data.etbId },
          orderBy: { sequenceNumber: 'desc' },
          select: { sequenceNumber: true },
        });

        const nextSequenceNumber = lastEntry ? lastEntry.sequenceNumber + 1 : 1;

        // Create the entry with the allocated sequence number
        return tx.etbEintrag.create({
          data: {
            etbId: data.etbId,
            timestamp: data.timestamp,
            sequenceNumber: nextSequenceNumber,
            kategorie: data.kategorie,
            text: data.text,
            createdBy: data.createdBy,
            version: data.version,
            funkrufname: data.funkrufname,
            standort: data.standort,
            isAutomatic: data.isAutomatic ?? false,
            metadata: data.metadata as Prisma.InputJsonValue,
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
      },
      {
        isolationLevel: 'Serializable', // Ensures strict isolation to prevent sequence number conflicts
      },
    );
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

  /**
   * Ruft die Versionshistorie eines ETB-Eintrags ab
   *
   * @param eintragId - ID des ETB-Eintrags
   * @param limit - Maximale Anzahl der Historie-Einträge
   * @param offset - Offset für Paginierung
   * @returns Liste der Historie-Einträge sortiert nach Version (neueste zuerst)
   */
  async findEintragHistoryById(eintragId: string, limit?: number, offset?: number) {
    return this.prisma.etbEintragHistorie.findMany({
      where: { eintragId },
      orderBy: { version: 'desc' },
      take: limit,
      skip: offset,
      include: {
        modifier: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });
  }

  /**
   * Zählt die Anzahl der Historie-Einträge für einen ETB-Eintrag
   *
   * @param eintragId - ID des ETB-Eintrags
   * @returns Anzahl der Historie-Einträge
   */
  async countEintragHistory(eintragId: string): Promise<number> {
    return this.prisma.etbEintragHistorie.count({
      where: { eintragId },
    });
  }
}
