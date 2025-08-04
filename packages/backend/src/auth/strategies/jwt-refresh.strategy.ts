import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload, ValidatedUser } from './jwt.strategy';
import { AuthService } from '../auth.service';

/**
 * JWT-Strategie für Refresh-Tokens
 *
 * Diese Strategie extrahiert und validiert Refresh-Tokens aus HTTP-Only Cookies.
 * Sie wird für das Erneuern von Access-Tokens verwendet.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.['refresh-token'];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
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
