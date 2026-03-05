import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '@/infrastructure/services/app-config.service';
import { PassportStrategy } from '@nestjs/passport';
import type { UserRole } from '@/generated/prisma/client';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';

/**
 * JWT-Payload-Interface
 */
export interface JwtPayload {
  sub: string;
  role?: UserRole;
  iat?: number;
  exp?: number;
}

/**
 * Validiertes Benutzer-Interface nach JWT-Validierung
 */
export interface ValidatedUser {
  userId: string;
  role?: UserRole;
}

/**
 * JWT-Strategie für Access-Tokens
 *
 * Diese Strategie extrahiert und validiert Access-Tokens aus HTTP-Only Cookies.
 * Sie wird für die Authentifizierung von API-Anfragen verwendet.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    appConfig: AppConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.accessToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKeyProvider: (_request: Request, _rawJwtToken: string, done: (err: unknown, secretOrKey?: string | Buffer) => void) => {
        const secret = appConfig.get<string>('JWT_SECRET');
        if (!secret || secret.trim().length === 0) {
          done(new UnauthorizedException('JWT_SECRET not configured'));
          return;
        }
        done(null, secret);
      },
    });
  }

  /**
   * Validiert das JWT-Payload und gibt den validierten Benutzer zurück
   *
   * @param payload - Das dekodierte JWT-Payload
   * @returns Der validierte Benutzer mit userId und role
   * @throws UnauthorizedException wenn der Benutzer nicht mehr existiert
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    // Prüfe ob der Benutzer noch in der Datenbank existiert
    const user = await this.authService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return {
      userId: payload.sub,
      role: payload.role,
    };
  }
}
