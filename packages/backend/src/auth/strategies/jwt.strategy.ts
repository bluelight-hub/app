import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

/**
 * JWT-Payload-Interface
 */
export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
}

/**
 * Validiertes Benutzer-Interface nach JWT-Validierung
 */
export interface ValidatedUser {
  userId: string;
}

/**
 * JWT-Strategie für Access-Tokens
 *
 * Diese Strategie extrahiert und validiert Access-Tokens aus HTTP-Only Cookies.
 * Sie wird für die Authentifizierung von API-Anfragen verwendet.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.accessToken;
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
