import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { SecurityLogService } from '@/security/services/security-log.service';
import { SecurityEventType } from '../constants/auth.constants';

/**
 * Guard für JWT-basierte Authentifizierung
 *
 * Schützt Routen vor unautorisiertem Zugriff durch Validierung von JWT-Tokens.
 * Wird global auf alle Routen angewendet, kann aber mit dem @Public() Decorator
 * für öffentliche Endpoints umgangen werden.
 *
 * @class JwtAuthGuard
 * @extends {AuthGuard('jwt')}
 *
 * @example
 * ```typescript
 * // Globale Anwendung in main.ts
 * app.useGlobalGuards(new JwtAuthGuard(reflector));
 *
 * // Öffentliche Route ohne Authentifizierung
 * @Public()
 * @Get('health')
 * getHealth() { ... }
 *
 * // Geschützte Route (Standard)
 * @Get('profile')
 * getProfile() { ... }
 * ```
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private reflector: Reflector,
    private securityLogService: SecurityLogService,
  ) {
    super();
  }

  /**
   * Prüft, ob die Route Authentifizierung erfordert
   *
   * Überprüft zuerst, ob die Route mit @Public() markiert ist.
   * Falls ja, wird der Zugriff ohne Authentifizierung erlaubt.
   * Andernfalls wird die JWT-Validierung durchgeführt.
   *
   * @param {ExecutionContext} context - Der Ausführungskontext der Anfrage
   * @returns {boolean | Promise<boolean>} true wenn Zugriff erlaubt, sonst false
   *
   * @example
   * ```typescript
   * // Wird automatisch vom NestJS Framework aufgerufen
   * const canAccess = await guard.canActivate(context);
   * ```
   */
  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }

  /**
   * Behandelt das Ergebnis der JWT-Validierung
   *
   * Wird nach der Passport-Strategie aufgerufen, um das Ergebnis
   * zu verarbeiten. Bei Fehlern oder fehlendem Benutzer wird eine
   * UnauthorizedException geworfen.
   *
   * @param {any} err - Fehler aus der Passport-Strategie
   * @param {any} user - Validierter Benutzer oder undefined
   * @param {any} info - Zusätzliche Informationen
   * @param {ExecutionContext} context - Der Ausführungskontext
   * @returns {any} Der authentifizierte Benutzer
   * @throws {UnauthorizedException} Wenn Authentifizierung fehlschlägt
   *
   * @example
   * ```typescript
   * // Wird intern von AuthGuard aufgerufen
   * try {
   *   const user = handleRequest(null, validatedUser, null);
   *   // user ist jetzt im Request verfügbar
   * } catch (e) {
   *   // UnauthorizedException wurde geworfen
   * }
   * ```
   */
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    if (err || !user) {
      // Log authentication failure
      const request = context?.switchToHttp()?.getRequest();
      if (request) {
        const ipAddress = request.ip || request.connection?.remoteAddress;
        const userAgent = request.headers['user-agent'];

        this.securityLogService
          .log(SecurityEventType.LOGIN_FAILED, {
            action: SecurityEventType.LOGIN_FAILED,
            userId: '',
            ip: ipAddress || '',
            userAgent,
            metadata: {
              reason: err?.message || info?.message || 'Authentication failed',
              path: request.path,
              method: request.method,
            },
          })
          .catch((error) => {
            this.logger.error('Failed to log authentication failure', error);
          });
      }

      throw err || new UnauthorizedException('Authentication required');
    }
    return user;
  }
}
