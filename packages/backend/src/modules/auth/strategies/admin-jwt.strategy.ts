import { ForbiddenException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { UserRole } from '@prisma/client';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
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
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  private readonly logger = new Logger(AdminJwtStrategy.name);
  private readonly MIN_DELAY_MS = 50;
  private readonly MAX_DELAY_MS = 100;

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
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
    return new Promise((resolve) => setTimeout(resolve, randomDelay));
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

    await this.validateAccessToken(accessToken, payload);
    await this.validateAdminPayload(payload);
    const user = await this.validateUserExists(payload.sub);
    await this.validateAdminRights(user, payload);

    // HI-4 Fix: Nur bei SUCCESS die userId loggen (keine Information Disclosure bei Fehlern)
    this.logger.log('Admin authentication successful', { userId: payload.sub });

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }

  /**
   * Validiert dass der Access Token vorhanden und gültig ist
   *
   * @param accessToken - Der Access Token aus dem Cookie
   * @param payload - JWT Payload für Logging
   * @throws UnauthorizedException wenn Token fehlt oder ungültig ist
   */
  private async validateAccessToken(accessToken: string | undefined, payload: AdminJwtPayload): Promise<void> {
    if (!accessToken || accessToken.trim() === '') {
      // HI-5 Fix: Logging für leeren accessToken (Empty-String-Angriffe)
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('Admin access attempt without valid access token');
      await this.constantTimeDelay();
      throw new UnauthorizedException('Unauthorized - Invalid admin credentials');
    }

    try {
      await this.authService.verifyAccessToken(accessToken);
    } catch (_error) {
      this.logger.debug('Error details:', _error);
      // HI-4 Fix: Keine userId bei Auth-Fehlern loggen (Information Disclosure)
      this.logger.warn('Admin access attempt with invalid access token');
      await this.constantTimeDelay();
      throw new UnauthorizedException('Unauthorized - Invalid admin credentials');
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
   * @param payload - JWT Payload für Logging
   * @throws ForbiddenException wenn keine Admin-Rechte mehr vorhanden sind
   */
  private async validateAdminRights(user: { id: string; role: UserRole }, payload: AdminJwtPayload): Promise<void> {
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
