import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JWTPayload } from '../types/jwt.types';
import { Request } from 'express';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * JWT-Authentifizierungsstrategie für die Validierung von Access-Tokens
 *
 * Diese Passport-Strategie extrahiert und validiert JWT-Tokens aus dem
 * Authorization-Header oder aus Cookies. Sie prüft zusätzlich, ob die
 * zugehörige Session noch aktiv ist und aktualisiert die letzte Aktivität.
 *
 * @class JwtStrategy
 * @extends {PassportStrategy(Strategy)}
 *
 * @example
 * ```typescript
 * // Wird automatisch von Passport bei geschützten Routen verwendet
 * @UseGuards(JwtAuthGuard)
 * @Get('profile')
 * getProfile(@Request() req) {
 *   // req.user enthält das validierte JWT-Payload
 *   return req.user;
 * }
 * ```
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  /**
   * Konstruktor der JWT-Strategie
   *
   * Konfiguriert die Passport JWT-Strategie mit benutzerdefinierten Optionen:
   * - Token-Extraktion aus Cookies oder Authorization-Header
   * - JWT-Secret aus Umgebungsvariablen
   * - Automatische Expired-Token-Prüfung
   *
   * @param {ConfigService} configService - Service für Konfigurationszugriff
   * @param {PrismaService} prisma - Datenbankservice für Session-Validierung
   */
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (request: Request) => {
        // First, try to get token from cookie
        if (request?.cookies?.access_token) {
          return request.cookies.access_token;
        }
        // Fallback to Authorization header
        return ExtractJwt.fromAuthHeaderAsBearerToken()(request);
      },
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validiert das JWT-Payload und die zugehörige Session
   *
   * Diese Methode wird nach erfolgreicher JWT-Signaturprüfung aufgerufen.
   * Sie führt zusätzliche Validierungen durch:
   * - Prüft die Vollständigkeit des Payloads
   * - Validiert, dass die Session noch aktiv ist
   * - Prüft, ob die Session nicht widerrufen wurde
   * - Aktualisiert die letzte Aktivität für Idle-Timeout-Tracking
   *
   * @param {JWTPayload} payload - Das dekodierte JWT-Payload
   * @returns {Promise<JWTPayload>} Das validierte Payload für req.user
   * @throws {UnauthorizedException} Bei ungültigem Payload oder inaktiver Session
   *
   * @example
   * ```typescript
   * // Wird automatisch von Passport aufgerufen
   * const validatedPayload = await strategy.validate({
   *   sub: 'user123',
   *   email: 'user@example.com',
   *   sessionId: 'sess_abc123',
   *   roles: ['USER'],
   *   permissions: ['READ'],
   *   iat: 1642339200,
   *   exp: 1642342800
   * });
   * ```
   */
  async validate(payload: JWTPayload): Promise<JWTPayload> {
    if (!payload.sub || !payload.email || !payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Validate session is still active in database
    const session = await this.prisma.session.findUnique({
      where: { jti: payload.sessionId },
    });

    if (!session || session.isRevoked) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    if (session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired');
    }

    // Update last activity for idle timeout tracking
    await this.prisma.session.update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    });

    return payload;
  }
}
