import { type CanActivate, type ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { BEFEHL_ROLLEN_KEY } from '@/modules/common/decorators/requires-befehl-rolle.decorator';
import type { EinsatzRolle } from '@/generated/prisma/client';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

/**
 * Guard zur Pruefung befehlsspezifischer Rollen im Einsatz-Kontext.
 *
 * Story 5.2 AC5: Prueft vor Befehl-Aktionen die Rollenberechtigung.
 *
 * **Ablauf:**
 * 1. Liest erforderliche Rollen aus @RequiresBefehlRolle() Decorator
 * 2. Kein Decorator → Fail-Closed
 * 3. Liest einsatzId aus Request (Body, Params, Query oder Befehl-Lookup)
 * 4. Prueft User-Rolle in DB via PrismaService
 * 5. Rolle vorhanden und in erlaubten Rollen → Zugriff erlaubt
 * 6. Fallback: Aktive Einsatz-Teilnehmer ohne explizite Rolle erhalten
 *    implizit BEOBACHTER-Zugriff (nur fuer Lese-Endpoints)
 */
@Injectable()
export class BefehlRollenGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Erforderliche Rollen aus Decorator lesen
    const requiredRollen = this.reflector.get<string[]>(BEFEHL_ROLLEN_KEY, context.getHandler());

    // 2. Kein Decorator → Fail-Closed (alle Endpoints MUESSEN explizit dekoriert werden)
    if (!requiredRollen || requiredRollen.length === 0) {
      throw new ForbiddenException('Endpoint nicht autorisiert: @RequiresBefehlRolle() Decorator fehlt. ' + 'Alle Endpoints im BefehlController muessen explizit dekoriert werden.');
    }

    const request = context.switchToHttp().getRequest();
    const user: ValidatedUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('Nicht authentifiziert');
    }

    // 3. einsatzId aus Body, Params oder Query extrahieren
    let einsatzId: string | undefined = request.body?.einsatzId || request.params?.einsatzId || request.query?.einsatzId;

    // 4. Fallback: einsatzId aus Befehl laden (fuer quittieren/korrigieren wo nur Befehl-ID im Param)
    if (!einsatzId && request.params?.id) {
      const befehl = await this.prisma.befehl.findUnique({
        where: { id: request.params.id },
        select: { einsatzId: true },
      });
      if (befehl) {
        einsatzId = befehl.einsatzId;
      }
    }

    // 5. Kein einsatzId → einsatzuebergreifender Endpoint (z.B. Metriken)
    //    Pruefe ob User die erforderliche Rolle in mindestens einem Einsatz hat
    if (!einsatzId) {
      const anyZuweisung = await this.prisma.einsatzRollenzuweisung.findFirst({
        where: {
          userId: user.userId,
          rolle: { in: requiredRollen as any[] },
        },
        select: { id: true },
      });

      if (!anyZuweisung) {
        throw new ForbiddenException(`Keine passende Rolle in einem Einsatz. Erforderlich: ${requiredRollen.join(' oder ')}`);
      }

      return true;
    }

    // 6. User-Rolle im spezifischen Einsatz-Kontext pruefen
    const zuweisung = await this.prisma.einsatzRollenzuweisung.findUnique({
      where: {
        einsatzId_userId: {
          einsatzId,
          userId: user.userId,
        },
      },
    });

    if (!zuweisung) {
      // Fallback: Aktive Einsatz-Teilnehmer erhalten implizit BEOBACHTER-Zugriff
      // (nur wenn der Endpoint BEOBACHTER als erlaubte Rolle definiert)
      if (requiredRollen.includes('BEOBACHTER')) {
        const teilnehmer = await this.prisma.einsatzTeilnehmer.findFirst({
          where: { userId: user.userId, einsatzId, leftAt: null },
          select: { id: true },
        });
        if (teilnehmer) {
          return true;
        }
      }
      throw new ForbiddenException('Keine Rolle im Einsatz zugewiesen');
    }

    // 6. Pruefe ob User-Rolle in den erlaubten Rollen enthalten ist
    if (!requiredRollen.includes(zuweisung.rolle as string)) {
      throw new ForbiddenException(`Rolle ${zuweisung.rolle} nicht berechtigt. Erforderlich: ${requiredRollen.join(' oder ')}`);
    }

    return true;
  }
}
