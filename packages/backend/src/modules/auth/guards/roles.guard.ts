import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../types/jwt.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard für rollenbasierte Zugriffskontrolle (RBAC)
 *
 * Prüft, ob der authentifizierte Benutzer eine der erforderlichen Rollen besitzt.
 * Wird zusammen mit dem @Roles() Decorator verwendet, um den Zugriff basierend
 * auf Benutzerrollen einzuschränken.
 *
 * @class RolesGuard
 * @implements {CanActivate}
 *
 * @example
 * ```typescript
 * // Controller mit Rollenschutz
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, RolesGuard)
 * export class AdminController {
 *
 *   // Nur für Admins zugänglich
 *   @Get('dashboard')
 *   @Roles(UserRole.ADMIN)
 *   getDashboard() { ... }
 *
 *   // Für Admins ODER Manager zugänglich
 *   @Get('reports')
 *   @Roles(UserRole.ADMIN, UserRole.MANAGER)
 *   getReports() { ... }
 * }
 * ```
 */
@Injectable()
export class RolesGuard implements CanActivate {
  /**
   * Konstruktor des RolesGuard
   *
   * @param {Reflector} reflector - NestJS Reflector Service zum Lesen von Route-Metadaten
   */
  constructor(private reflector: Reflector) {}

  /**
   * Prüft, ob der Benutzer eine der erforderlichen Rollen besitzt
   *
   * Extrahiert die erforderlichen Rollen aus den Route-Metadaten
   * und prüft, ob der authentifizierte Benutzer mindestens eine
   * der angegebenen Rollen besitzt (OR-Verknüpfung).
   *
   * @param {ExecutionContext} context - Der Ausführungskontext der Anfrage
   * @returns {boolean} true wenn der Benutzer eine der Rollen hat, sonst false
   *
   * @example
   * ```typescript
   * // Wird automatisch vom NestJS Framework aufgerufen
   * // Benutzer muss MINDESTENS EINE der angegebenen Rollen haben
   *
   * // Route erfordert ADMIN oder MANAGER Rolle
   * @Roles(UserRole.ADMIN, UserRole.MANAGER)
   * @Get('users')
   * getUsers() {
   *   // Guard prüft: user.roles.includes('ADMIN') ||
   *   //              user.roles.includes('MANAGER')
   * }
   * ```
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.roles) {
      return false;
    }

    return requiredRoles.some((role) => user.roles?.includes(role));
  }
}
