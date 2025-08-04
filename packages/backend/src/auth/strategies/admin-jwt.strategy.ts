import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { ADMIN_JWT_COOKIE } from '../constants/auth.constants';

/**
 * Admin JWT-Payload-Interface
 */
export interface AdminJwtPayload {
  sub: string;
  username: string;
  isAdmin: boolean;
  iat?: number;
  exp?: number;
}

/**
 * Validierter Admin-Benutzer nach JWT-Validierung
 */
export interface ValidatedAdminUser {
  userId: string;
  username: string;
  isAdmin: boolean;
}

/**
 * JWT-Strategie für Admin-Tokens
 *
 * Diese Strategie extrahiert und validiert Admin-Tokens aus HTTP-Only Cookies.
 * Sie stellt sicher, dass nur Tokens mit isAdmin=true akzeptiert werden.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.[ADMIN_JWT_COOKIE];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('ADMIN_JWT_SECRET'),
    });
  }

  /**
   * Validiert das Admin JWT-Payload und gibt den validierten Admin-Benutzer zurück
   *
   * @param payload - Das dekodierte JWT-Payload
   * @returns Der validierte Admin-Benutzer
   * @throws UnauthorizedException wenn isAdmin nicht true ist
   */
  async validate(payload: AdminJwtPayload): Promise<ValidatedAdminUser> {
    if (!payload.isAdmin) {
      throw new UnauthorizedException('Token is not an admin token');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      isAdmin: payload.isAdmin,
    };
  }
}
