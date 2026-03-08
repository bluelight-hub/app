import { Injectable } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { EinsatzRolle } from '@domain/value-objects/einsatz-rolle';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import type { EinsatzRolle as PrismaEinsatzRolle } from '@/generated/prisma/client';
import type { UpdateEinsatzRollenCommand } from './update-einsatz-rollen.command';

/**
 * Handler fuer UpdateEinsatzRollenCommand.
 *
 * Atomar: Loescht alle bestehenden Rollen und setzt neue.
 * KEIN Domain Event noetig — Admin-Aktion ohne Befehl-Domain-Relevanz.
 *
 * Story 5.2 AC3: PUT-Semantik.
 */
@Injectable()
export class UpdateEinsatzRollenHandler {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fuehrt das atomare Rollen-Update aus.
   *
   * Validierung:
   * 1. Einsatz existiert
   * 2. Alle Rollen gueltig
   * 3. Alle User existieren
   * 4. Keine doppelten User-IDs
   */
  async execute(command: UpdateEinsatzRollenCommand): Promise<Result<void>> {
    try {
      // 1. Einsatz-Existenz pruefen
      const einsatz = await this.prisma.einsatz.findUnique({
        where: { id: command.einsatzId },
        select: { id: true },
      });

      if (!einsatz) {
        return Result.fail<void>(`Einsatz mit ID ${command.einsatzId} nicht gefunden`);
      }

      // 2. Rollen validieren
      for (const z of command.zuweisungen) {
        const rolleResult = EinsatzRolle.create(z.rolle);
        if (rolleResult.isFailure) {
          return Result.fail<void>(rolleResult.error ?? 'Ungültige Einsatzrolle');
        }
      }

      // 3. Doppelte User-IDs pruefen
      const userIds = command.zuweisungen.map((z) => z.userId);
      const uniqueUserIds = new Set(userIds);
      if (uniqueUserIds.size !== userIds.length) {
        return Result.fail<void>('Doppelte User-IDs in Zuweisungen');
      }

      // 4. Atomares Update mit User-Existenz-Check innerhalb der Transaction (TOCTOU-sicher)
      await this.prisma.$transaction(async (tx) => {
        // User-Existenz pruefen (nur wenn Zuweisungen vorhanden)
        if (userIds.length > 0) {
          const existingUsers = await tx.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true },
          });

          const existingUserIds = new Set(existingUsers.map((u) => u.id));
          const missingUserIds = userIds.filter((id) => !existingUserIds.has(id));

          if (missingUserIds.length > 0) {
            throw new Error(`User nicht gefunden: ${missingUserIds.join(', ')}`);
          }
        }

        // Alle bestehenden Rollen fuer diesen Einsatz loeschen
        await tx.einsatzRollenzuweisung.deleteMany({
          where: { einsatzId: command.einsatzId },
        });

        // Neue Rollen setzen (nur wenn Zuweisungen vorhanden)
        if (command.zuweisungen.length > 0) {
          await tx.einsatzRollenzuweisung.createMany({
            data: command.zuweisungen.map((z) => ({
              einsatzId: command.einsatzId,
              userId: z.userId,
              rolle: z.rolle as PrismaEinsatzRolle,
            })),
          });
        }
      });

      return Result.ok<void>(undefined);
    } catch (error) {
      return Result.fail<void>(`Rollen-Update fehlgeschlagen: ${error instanceof Error ? error.message : 'Unbekannter Fehler'}`);
    }
  }
}
