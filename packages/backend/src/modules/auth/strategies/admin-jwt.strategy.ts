import { ForbiddenException, Inject, Injectable, type OnModuleDestroy, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { UserRole } from '@/generated/prisma/client';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { AuthService } from '../auth.service';
import { isAdmin } from '../utils/auth.utils';

/**
 * Admin JWT-Payload-Interface
 */

export interface AdminJwtPayload {
  sub: string;
  username: string;
  role: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Validierter Admin-Benutzer nach JWT-Validierung
 */
export interface ValidatedAdminUser {
  userId: string;
  username: string;
  role: UserRole;
}

/**
 * Erweitertes Admin-JWT-Payload mit isAdmin-Flag
 */
interface ExtendedAdminJwtPayload extends AdminJwtPayload {
  isAdmin?: boolean;
}

/**
 * Type Guard zur sicheren Prüfung des isAdmin-Flags
 *
 * Prüft zur Laufzeit, ob das Payload das erweiterte Format mit isAdmin-Flag hat.
 * Dies ersetzt unsicheres Type Casting und bietet Runtime-Validierung.
 *
 * @param payload - Das zu prüfende Payload
 * @returns true wenn isAdmin vorhanden und ein boolean ist
 */
function hasIsAdminFlag(payload: AdminJwtPayload): payload is ExtendedAdminJwtPayload {
  return 'isAdmin' in payload && typeof (payload as ExtendedAdminJwtPayload).isAdmin === 'boolean';
}

/**
 * JWT-Strategie für Admin-Tokens
 *
 * Diese Strategie extrahiert und validiert Admin-Tokens aus HTTP-Only Cookies.
 * Sie stellt sicher, dass nur Tokens mit isAdmin=true akzeptiert werden.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') implements OnModuleDestroy {
  private readonly MIN_DELAY_MS = 50;
  private readonly MAX_DELAY_MS = 100;

  /**
   * Set aller pending Timeouts für Cleanup bei Module Destroy.
   * Verhindert Memory Leaks wenn der Service gestoppt wird während Timeouts laufen.
   */
  private readonly pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          const adminToken = req?.cookies?.adminToken;
          // Reject empty strings and whitespace-only tokens
          if (adminToken && adminToken.trim() === '') {
            return null;
          }
          return adminToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
      passReqToCallback: true, // Pass the request to the validate method
    } as never);
  }

  /**
   * Cleanup aller pending Timeouts bei Module Destroy.
   * Verhindert Memory Leaks wenn der Service gestoppt wird während Auth-Requests laufen.
   */
  onModuleDestroy(): void {
    for (const timeoutId of this.pendingTimeouts) {
      clearTimeout(timeoutId);
    }
    this.pendingTimeouts.clear();
  }

  /**
   * Führt eine konstante Zeitverzögerung aus, um Timing-Angriffe zu verhindern
   *
   * Diese Methode fügt einen zufälligen Delay zwischen MIN_DELAY_MS und MAX_DELAY_MS hinzu,
   * um zu verhindern, dass Angreifer anhand der Antwortzeit unterscheiden können:
   * - Ob ein Benutzer existiert (DB-Lookup-Zeit)
   * - Ob Admin-Rechte vorhanden sind (Role-Check-Zeit)
   * - Ob Tokens gültig sind (Auth-Validierungszeit)
   *
   * **Warum konstante Zeit wichtig ist:**
   * - User Enumeration Prevention: Verhindert Aufzählung gültiger Benutzernamen
   * - Timing Attack Mitigation: Macht Timing-Analyse nutzlos
   * - Security Best Practice: OWASP Empfehlung für Authentication
   *
   * @returns Promise das nach zufälliger Verzögerung resolved
   */
  private async constantTimeDelay(): Promise<void> {
    const randomDelay = Math.floor(Math.random() * (this.MAX_DELAY_MS - this.MIN_DELAY_MS + 1)) + this.MIN_DELAY_MS;
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.pendingTimeouts.delete(timeoutId);
        resolve();
      }, randomDelay);
      this.pendingTimeouts.add(timeoutId);
    });
  }

  /**
   * Validiert das Admin-JWT-Payload
   *
   * @param req - Request-Objekt mit Cookies
   * @param payload - Das dekodierte JWT-Payload
   * @returns Der validierte Admin-Benutzer
   * @throws UnauthorizedException wenn der Benutzer kein Admin ist oder nicht mehr existiert
   */
  async validate(req: Request, payload: AdminJwtPayload): Promise<ValidatedAdminUser> {
    const accessToken = req?.cookies?.accessToken;

    await this.validateAccessToken(accessToken);
    await this.validateAdminPayload(payload);
    const user = await this.validateUserExists(payload.sub);
    await this.validateAdminRights(user);

    // HI-4 Fix: Nur bei SUCCESS die userId loggen (keine Information Disclosure bei Fehlern)
    this.logger.log('Admin authentication successful', { userId: payload.sub });

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }

  /**
   * Validiert den Access Token falls vorhanden (optional)
   *
   * Der Access-Token-Check ist optional, da der adminToken bereits alle nötigen
   * Informationen enthält (userId, role, isAdmin). Der adminToken wird mit einem
   * separaten Secret signiert und die DB-Prüfungen (validateUserExists, validateAdminRights)
   * stellen sicher, dass der User noch existiert und Admin-Rechte hat.
   *
   * Diese Änderung behebt das Problem, dass Admin-Sessions nach 15 Minuten ungültig
   * werden, obwohl der adminToken noch gültig ist - weil der accessToken abgelaufen war
   * und der Auto-Refresh nicht vor der Admin-Validierung greift.
   *
   * @param accessToken - Der Access Token aus dem Cookie (optional)
   */
  private async validateAccessToken(accessToken: string | undefined): Promise<void> {
    // Wenn kein accessToken vorhanden → Skip (adminToken reicht für Admin-Auth)
    if (!accessToken || accessToken.trim() === '') {
      this.logger.debug('No accessToken present, relying on adminToken only');
      return;
    }

    try {
      await this.authService.verifyAccessToken(accessToken);
      this.logger.debug('AccessToken validation successful');
    } catch (_error) {
      // AccessToken ungültig/abgelaufen → Skip (adminToken reicht für Admin-Auth)
      // Dies ist kein Sicherheitsproblem, da:
      // 1. adminToken wurde bereits von Passport validiert (Signatur + Expiry)
      // 2. validateUserExists() prüft ob User noch in DB existiert
      // 3. validateAdminRights() prüft ob User noch Admin-Rolle hat
      this.logger.debug('AccessToken invalid/expired, relying on adminToken only');
      return;
    }
  }

  /**
   * Validiert dass das Payload Admin-Rechte enthält
   *
   * @param payload - JWT Payload
   * @throws ForbiddenException wenn keine Admin-Rechte vorhanden sind
   */
  private async validateAdminPayload(payload: AdminJwtPayload): Promise<void> {
    // Check both formats: new tokens with isAdmin field (type-safe), and legacy check based on role
    const hasNewFormat = hasIsAdminFlag(payload);
    const hasLegacyRole = payload.role && isAdmin(payload.role);

    if (!hasNewFormat && !hasLegacyRole) {
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('Admin access attempt without admin role', {
        role: payload?.role,
      });
      await this.constantTimeDelay();
      throw new ForbiddenException('Token is not an admin token');
    }

    // If new format is present, ensure isAdmin is true
    if (hasNewFormat && !payload.isAdmin) {
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('Admin access attempt with isAdmin=false', {
        isAdmin: payload.isAdmin,
      });
      await this.constantTimeDelay();
      throw new ForbiddenException('Token is not an admin token');
    }
  }

  /**
   * Validiert dass der Benutzer in der Datenbank existiert
   *
   * Gibt 401 Unauthorized zurück wenn der Benutzer nicht existiert, anstatt 404 Not Found.
   * Dies ist eine bewusste Entscheidung aus Security-Gründen (Information Disclosure Prevention):
   * Ein Angreifer soll nicht unterscheiden können, ob ein User existiert oder die Credentials
   * ungültig sind. Die generische "Unauthorized" Nachricht verhindert User Enumeration.
   *
   * @param userId - Die User-ID aus dem JWT Payload
   * @returns Der gefundene Benutzer
   * @throws UnauthorizedException wenn der Benutzer nicht existiert oder Lookup fehlschlägt
   */
  private async validateUserExists(userId: string): Promise<{ id: string; role: UserRole }> {
    // Input Validation: Prüfe ob userId ein gültiger String ist (nicht leer, kein Whitespace)
    // Dies verhindert Angriffe mit manipulierten JWT Payloads (z.B. sub: "" oder sub: "   ")
    if (!userId || typeof userId !== 'string' || userId.trim() === '') {
      this.logger.warn('Admin access attempt with invalid userId in payload');
      await this.constantTimeDelay();
      throw new UnauthorizedException('Unauthorized - Invalid admin credentials');
    }

    let user: { id: string; role: UserRole } | null;
    try {
      user = await this.authService.findUserById(userId);
    } catch (_error) {
      this.logger.debug('Error details:', _error);
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('User lookup failed during admin authentication');
      await this.constantTimeDelay();
      throw new UnauthorizedException('Unauthorized - Invalid admin credentials');
    }

    if (!user) {
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('Admin access attempt for non-existent user');
      await this.constantTimeDelay();
      throw new UnauthorizedException('Unauthorized - Invalid admin credentials');
    }

    return user;
  }

  /**
   * Validiert dass der Benutzer noch Admin-Rechte in der Datenbank hat
   *
   * @param user - Der Benutzer aus der Datenbank
   * @throws ForbiddenException wenn keine Admin-Rechte mehr vorhanden sind
   */
  private async validateAdminRights(user: { id: string; role: UserRole }): Promise<void> {
    if (!isAdmin(user.role)) {
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('Admin access attempt without admin role', {
        role: user.role,
      });
      await this.constantTimeDelay();
      throw new ForbiddenException('User is no longer an admin');
    }
  }
}
