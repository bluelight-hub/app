import { Injectable } from '@nestjs/common';
import type { TransactionContext } from '@domain/common/transaction';
import type { EinsatzTeilnehmerDto, IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { Prisma } from '@/generated/prisma/client';

/**
 * Transaction Client Type Alias für bessere Lesbarkeit.
 */
type PrismaTransactionClient = Prisma.TransactionClient;

/**
 * Prisma-Include für EinsatzPerson-Join.
 */
const EINSATZ_PERSON_INCLUDE = {
  einsatzPerson: {
    select: {
      vorname: true,
      nachname: true,
      funkrufname: true,
      funktion: true,
    },
  },
} as const;

/**
 * Prisma Implementation des EinsatzTeilnehmer Repository.
 *
 * Ermöglicht das Verwalten von Einsatz-Beitritten und EinsatzPerson-Verknüpfungen.
 * Wird für ETB-Absender Auto-Fill verwendet.
 */
@Injectable()
export class PrismaEinsatzTeilnehmerRepository implements IEinsatzTeilnehmerRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Ermittelt den Prisma-Client (direkt oder Transaction).
   */
  private getClient(tx?: TransactionContext): PrismaService | PrismaTransactionClient {
    return tx ? (tx as PrismaTransactionClient) : this.prisma;
  }

  /**
   * Mappt Prisma-Ergebnis zu DTO.
   */
  private toDto(row: {
    id: string;
    einsatzId: string;
    userId: string;
    einsatzPersonId: string;
    joinedAt: Date;
    leftAt: Date | null;
    einsatzPerson: {
      vorname: string;
      nachname: string;
      funkrufname: string | null;
      funktion: string;
    };
  }): EinsatzTeilnehmerDto {
    return {
      id: row.id,
      einsatzId: row.einsatzId,
      userId: row.userId,
      einsatzPersonId: row.einsatzPersonId,
      personVorname: row.einsatzPerson.vorname,
      personNachname: row.einsatzPerson.nachname,
      personFunkrufname: row.einsatzPerson.funkrufname,
      personFunktion: row.einsatzPerson.funktion,
      joinedAt: row.joinedAt,
      leftAt: row.leftAt,
    };
  }

  async findByEinsatzAndUser(einsatzId: string, userId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null> {
    const client = this.getClient(tx);

    const result = await client.einsatzTeilnehmer.findUnique({
      where: {
        einsatzId_userId: {
          einsatzId,
          userId,
        },
      },
      include: EINSATZ_PERSON_INCLUDE,
    });

    if (!result || result.leftAt !== null) {
      return null;
    }

    return this.toDto(result);
  }

  async findActiveByEinsatz(einsatzId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto[]> {
    const client = this.getClient(tx);

    const results = await client.einsatzTeilnehmer.findMany({
      where: {
        einsatzId,
        leftAt: null,
      },
      include: EINSATZ_PERSON_INCLUDE,
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return results.map((r) => this.toDto(r));
  }

  async isPersonAlreadyLinked(einsatzId: string, einsatzPersonId: string, excludeUserId?: string, tx?: TransactionContext): Promise<boolean> {
    const client = this.getClient(tx);

    const existing = await client.einsatzTeilnehmer.findFirst({
      where: {
        einsatzId,
        einsatzPersonId,
        leftAt: null,
        ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    return !!existing;
  }

  async create(
    teilnehmer: {
      einsatzId: string;
      userId: string;
      einsatzPersonId: string;
    },
    tx?: TransactionContext,
  ): Promise<EinsatzTeilnehmerDto> {
    const client = this.getClient(tx);

    const result = await client.einsatzTeilnehmer.create({
      data: {
        einsatzId: teilnehmer.einsatzId,
        userId: teilnehmer.userId,
        einsatzPersonId: teilnehmer.einsatzPersonId,
      },
      include: EINSATZ_PERSON_INCLUDE,
    });

    return this.toDto(result);
  }

  async updateEinsatzPerson(einsatzId: string, userId: string, einsatzPersonId: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null> {
    const client = this.getClient(tx);

    try {
      const result = await client.einsatzTeilnehmer.update({
        where: {
          einsatzId_userId: {
            einsatzId,
            userId,
          },
          leftAt: null,
        },
        data: {
          einsatzPersonId,
        },
        include: EINSATZ_PERSON_INCLUDE,
      });

      return this.toDto(result);
    } catch {
      return null;
    }
  }

  async leave(einsatzId: string, userId: string, tx?: TransactionContext): Promise<boolean> {
    const client = this.getClient(tx);

    try {
      await client.einsatzTeilnehmer.update({
        where: {
          einsatzId_userId: {
            einsatzId,
            userId,
          },
          leftAt: null,
        },
        data: {
          leftAt: new Date(),
        },
      });

      return true;
    } catch {
      return false;
    }
  }
}
