import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Permission } from '../types/jwt.types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/**
 * Guard für berechtigungsbasierte Zugriffskontrolle
 *
 * Validiert spezifische Benutzerberechtigungen für feingranulare Zugriffskontrolle.
 * Wird zusammen mit dem @RequirePermissions() Decorator verwendet, um zu prüfen,
 * ob ein Benutzer die erforderlichen Berechtigungen besitzt.
 *
 * @class PermissionsGuard
 * @implements {CanActivate}
 *
 * @example
 * ```typescript
 * // Controller mit Berechtigungsschutz
 * @Controller('admin')
 * @UseGuards(JwtAuthGuard, PermissionsGuard)
 * export class AdminController {
 *
 *   // Benötigt USERS_WRITE Berechtigung
 *   @Post('users')
 *   @RequirePermissions(Permission.USERS_WRITE)
 *   createUser() { ... }
 *
 *   // Benötigt mehrere Berechtigungen
 *   @Delete('users/:id')
 *   @RequirePermissions(Permission.USERS_WRITE, Permission.USERS_DELETE)
 *   deleteUser() { ... }
 * }
 * ```
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  /**
   * Konstruktor des PermissionsGuard
   *
   * @param {Reflector} reflector - NestJS Reflector Service zum Lesen von Metadaten
   */
  constructor(private reflector: Reflector) {}

  /**
   * Prüft, ob der Benutzer die erforderlichen Berechtigungen besitzt
   *
   * Extrahiert die erforderlichen Berechtigungen aus den Route-Metadaten
   * und vergleicht sie mit den Berechtigungen des authentifizierten Benutzers.
   * Alle erforderlichen Berechtigungen müssen vorhanden sein.
   *
   * @param {ExecutionContext} context - Der Ausführungskontext der Anfrage
   * @returns {boolean} true wenn alle Berechtigungen vorhanden sind, sonst false
   *
   * @example
   * ```typescript
   * // Wird automatisch vom NestJS Framework aufgerufen
   * // Benutzer muss ALLE angegebenen Berechtigungen haben
   *
   * // Route erfordert USERS_READ und USERS_WRITE
   * @RequirePermissions(Permission.USERS_READ, Permission.USERS_WRITE)
   * @Get('users')
   * getUsers() {
   *   // Guard prüft: user.permissions.includes('USERS_READ') &&
   *   //              user.permissions.includes('USERS_WRITE')
   * }
   * ```
   */
  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      return false;
    }

    return requiredPermissions.every((permission) => user.permissions?.includes(permission));
  }
}
