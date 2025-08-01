import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { JwtPayload, ValidatedUser } from './jwt.strategy';

/**
 * JWT-Strategie für Refresh-Tokens
 *
 * Diese Strategie extrahiert und validiert Refresh-Tokens aus HTTP-Only Cookies.
 * Sie wird für das Erneuern von Access-Tokens verwendet.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.refreshToken;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  /**
   * Validiert das JWT-Payload und gibt den validierten Benutzer zurück
   *
   * @param payload - Das dekodierte JWT-Payload
   * @returns Der validierte Benutzer mit userId
   */
  async validate(payload: JwtPayload): Promise<ValidatedUser> {
    return { userId: payload.sub };
  }
}
