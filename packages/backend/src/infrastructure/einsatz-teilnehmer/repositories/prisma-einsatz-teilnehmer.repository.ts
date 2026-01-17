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
 * Prisma Implementation des EinsatzTeilnehmer Repository.
 *
 * Ermöglicht das Verwalten von Einsatz-Beitritten und Funkrufnamen-Zuordnungen.
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
  private toDto(row: { id: string; einsatzId: string; userId: string; funkrufname: string; joinedAt: Date; leftAt: Date | null }): EinsatzTeilnehmerDto {
    return {
      id: row.id,
      einsatzId: row.einsatzId,
      userId: row.userId,
      funkrufname: row.funkrufname,
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
      orderBy: {
        joinedAt: 'asc',
      },
    });

    return results.map((r) => this.toDto(r));
  }

  async create(
    teilnehmer: {
      einsatzId: string;
      userId: string;
      funkrufname: string;
    },
    tx?: TransactionContext,
  ): Promise<EinsatzTeilnehmerDto> {
    const client = this.getClient(tx);

    const result = await client.einsatzTeilnehmer.create({
      data: {
        einsatzId: teilnehmer.einsatzId,
        userId: teilnehmer.userId,
        funkrufname: teilnehmer.funkrufname,
      },
    });

    return this.toDto(result);
  }

  async updateFunkrufname(einsatzId: string, userId: string, funkrufname: string, tx?: TransactionContext): Promise<EinsatzTeilnehmerDto | null> {
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
          funkrufname,
        },
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
