import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzRolleDto } from '@/application/einsatz/dto/einsatz-rolle.dto';
import type { GetEinsatzRollenQuery } from './get-einsatz-rollen.query';

/**
 * Handler fuer GetEinsatzRollenQuery.
 *
 * CQRS Query-Side: Read-Only, PrismaService direkt (kein Repository).
 *
 * Story 5.2 AC4: Liefert alle Rollenzuweisungen fuer einen Einsatz.
 */
@Injectable()
export class GetEinsatzRollenQueryHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuehrt die Query aus und gibt alle Rollenzuweisungen zurueck.
   */
  async execute(query: GetEinsatzRollenQuery): Promise<Result<EinsatzRolleDto[]>> {
    try {
      // 1. Einsatz-Existenz pruefen
      const einsatz = await this.prisma.einsatz.findUnique({
        where: { id: query.einsatzId },
        select: { id: true },
      });

      if (!einsatz) {
        return Result.fail<EinsatzRolleDto[]>(`Einsatz mit ID ${query.einsatzId} nicht gefunden`);
      }

      // 2. Rollenzuweisungen mit User-Join laden
      const zuweisungen = await this.prisma.einsatzRollenzuweisung.findMany({
        where: { einsatzId: query.einsatzId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { zugewiesenAm: 'asc' },
      });

      // 3. Zu DTOs mappen
      const dtos: EinsatzRolleDto[] = zuweisungen.map((z) => ({
        userId: z.user.id,
        userName: z.user.username,
        rolle: z.rolle,
      }));

      return Result.ok<EinsatzRolleDto[]>(dtos);
    } catch (error) {
      return Result.fail<EinsatzRolleDto[]>(`Rollen-Abfrage fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
