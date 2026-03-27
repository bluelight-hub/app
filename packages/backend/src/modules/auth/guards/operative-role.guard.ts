import { type CanActivate, type ExecutionContext, Injectable, ForbiddenException, Inject } from '@nestjs/common';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@/infrastructure/di-tokens';
import { Reflector } from '@nestjs/core';
import type { OperativeRole } from '@/generated/prisma/client';
import { OPERATIVE_ROLES_KEY } from '../decorators/operative-roles.decorator';
import type { ValidatedUser } from '../strategies/jwt.strategy';

/**
 * Guard zur operativen Rollenkontrolle.
 *
 * Prüft ob der User eine der erforderlichen operativen Rollen hat.
 * Muss NACH JwtAuthGuard verwendet werden.
 */
@Injectable()
export class OperativeRoleGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private reflector: Reflector,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<OperativeRole[]>(OPERATIVE_ROLES_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: ValidatedUser | undefined = request.user;

    if (!user) {
      this.logger.warn('OperativeRoleGuard: Kein User im Request — JwtAuthGuard fehlt?');
      throw new ForbiddenException('Nicht authentifiziert');
    }

    if (!user.operativeRole) {
      this.logger.warn(`OperativeRoleGuard: User ${user.userId} hat keine operative Rolle`);
      throw new ForbiddenException('Keine operative Rolle zugewiesen');
    }

    const hasRequiredRole = requiredRoles.includes(user.operativeRole);

    if (!hasRequiredRole) {
      this.logger.warn(`OperativeRoleGuard: User ${user.userId} mit Rolle ${user.operativeRole} abgelehnt (benötigt: ${requiredRoles.join(', ')})`);
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Diese Funktion erfordert eine andere operative Rolle',
        suggestedAction: 'Zurück zum Überblick',
      });
    }

    return true;
  }
}
