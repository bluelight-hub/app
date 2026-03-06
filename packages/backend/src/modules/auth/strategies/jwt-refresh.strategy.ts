import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AppConfigService } from '@/infrastructure/services/app-config.service';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import type { JwtPayload, ValidatedUser } from './jwt.strategy';

/**
 * JWT-Strategie für Refresh-Tokens
 *
 * Diese Strategie extrahiert und validiert Refresh-Tokens aus HTTP-Only Cookies.
 * Sie wird für das Erneuern von Access-Tokens verwendet.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    appConfig: AppConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.refreshToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKeyProvider: (_request: Request, _rawJwtToken: string, done: (err: unknown, secretOrKey?: string | Buffer) => void) => {
        const secret = appConfig.get<string>('JWT_REFRESH_SECRET');
        if (!secret || secret.trim().length === 0) {
          done(new UnauthorizedException('JWT_REFRESH_SECRET ist nicht im zentralen Secret-System konfiguriert'));
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
   * @returns Der validierte Benutzer mit userId
   * @throws UnauthorizedException wenn der Benutzer nicht mehr existiert
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    // Prüfe ob der Benutzer noch in der Datenbank existiert
    const user = await this.authService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    return { userId: payload.sub };
  }
}
