import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import { Injectable } from '@nestjs/common';
import type { CanMutateEinsatzQuery } from './can-mutate-einsatz.query';

/**
 * Handler für fachliche Autorisierung von Einsatz-Mutationen.
 *
 * Regel:
 * - ADMIN/SUPER_ADMIN: immer erlaubt
 * - sonst erlaubt, wenn User
 *   1) Ersteller des Einsatzes ist ODER
 *   2) aktiver Einsatz-Teilnehmer ist (leftAt = null) ODER
 *   3) im Einsatz die Rolle ERSTELLER oder BEFEHLSGEBER hat
 */
@Injectable()
export class CanMutateEinsatzQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: CanMutateEinsatzQuery): Promise<Result<boolean>> {
    try {
      const einsatz = await this.prisma.einsatz.findUnique({
        where: { id: query.einsatzId },
        select: {
          id: true,
          createdBy: true,
        },
      });

      if (!einsatz) {
        return Result.fail<boolean>(`Einsatz mit ID ${query.einsatzId} nicht gefunden`);
      }

      if (query.userRole === 'ADMIN' || query.userRole === 'SUPER_ADMIN') {
        return Result.ok<boolean>(true);
      }

      if (einsatz.createdBy === query.userId) {
        return Result.ok<boolean>(true);
      }

      const aktiveTeilnahme = await this.prisma.einsatzTeilnehmer.findFirst({
        where: {
          einsatzId: query.einsatzId,
          userId: query.userId,
          leftAt: null,
        },
        select: { id: true },
      });

      if (aktiveTeilnahme) {
        return Result.ok<boolean>(true);
      }

      const rolle = await this.prisma.einsatzRollenzuweisung.findUnique({
        where: {
          einsatzId_userId: {
            einsatzId: query.einsatzId,
            userId: query.userId,
          },
        },
        select: { rolle: true },
      });

      if (rolle?.rolle === 'ERSTELLER' || rolle?.rolle === 'BEFEHLSGEBER') {
        return Result.ok<boolean>(true);
      }

      return Result.ok<boolean>(false);
    } catch (error) {
      return Result.fail<boolean>(`Autorisierungspruefung fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
