import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { Result } from '@domain/common/result';
import type { IEinsatzRollenReadRepository, MeineRolleReadDto } from '@domain/repositories/i-einsatz-rollen-read.repository';

/**
 * Prisma Implementation des IEinsatzRollenReadRepository.
 *
 * Story 4.3: Read-Only Queries fuer Einsatz-Rollenzuweisungen.
 * Entkoppelt Application Layer Handler von Prisma (Hexagonale Architektur).
 */
@Injectable()
export class PrismaEinsatzRollenReadRepository implements IEinsatzRollenReadRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Findet die Rollenzuweisung eines Users in einem Einsatz.
   */
  async findMeineRolle(einsatzId: string, userId: string): Promise<Result<MeineRolleReadDto>> {
    try {
      const zuweisung = await this.prisma.einsatzRollenzuweisung.findUnique({
        where: {
          einsatzId_userId: {
            einsatzId,
            userId,
          },
        },
      });

      return Result.ok<MeineRolleReadDto>({
        rolle: zuweisung?.rolle ?? null,
      });
    } catch (error) {
      return Result.fail<MeineRolleReadDto>(`Rollen-Abfrage fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }

  /**
   * Prueft ob im Einsatz ueberhaupt Rollenzuweisungen existieren.
   */
  async hasAnyRollen(einsatzId: string): Promise<Result<boolean>> {
    try {
      const count = await this.prisma.einsatzRollenzuweisung.count({
        where: { einsatzId },
        take: 1,
      });
      return Result.ok(count > 0);
    } catch (error) {
      return Result.fail<boolean>(`Rollen-Count fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
