import { Injectable, CanActivate, ExecutionContext, Logger, Optional } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../types/jwt.types';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { SecurityLogService } from '@/security/services/security-log.service';
import { SecurityEventTypeExtended } from '@/security/constants/event-types';

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
  private readonly logger = new Logger(RolesGuard.name);

  /**
   * Konstruktor des RolesGuard
   *
   * @param {Reflector} reflector - NestJS Reflector Service zum Lesen von Route-Metadaten
   * @param {SecurityLogService} securityLogService - Service für Security-Logging (optional)
   */
  constructor(
    private reflector: Reflector,
    @Optional() private securityLogService: SecurityLogService,
  ) {}

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
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const { user } = request;

    if (!user || !user.roles) {
      await this.logPermissionDenied(request, user, requiredRoles, 'No user or roles');
      return false;
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role));

    if (!hasRole) {
      await this.logPermissionDenied(request, user, requiredRoles, 'Insufficient roles');
    }

    return hasRole;
  }

  /**
   * Protokolliert einen Permission-Denied-Event
   *
   * @param request - Der HTTP-Request
   * @param user - Der Benutzer (falls vorhanden)
   * @param requiredRoles - Die erforderlichen Rollen
   * @param reason - Der Grund für die Ablehnung
   */
  private async logPermissionDenied(
    request: any,
    user: any,
    requiredRoles: UserRole[],
    reason: string,
  ): Promise<void> {
    try {
      const ipAddress = request.ip || request.connection?.remoteAddress;
      const userAgent = request.headers['user-agent'];

      if (this.securityLogService) {
        await this.securityLogService.log(SecurityEventTypeExtended.PERMISSION_DENIED, {
          action: SecurityEventTypeExtended.PERMISSION_DENIED,
          userId: user?.id || '',
          ip: ipAddress || '',
          userAgent,
          metadata: {
            reason,
            path: request.path,
            method: request.method,
            requiredRoles,
            userRoles: user?.roles || [],
          },
        });
      }
    } catch (error) {
      this.logger.error('Failed to log permission denied event', error);
    }
  }
}
