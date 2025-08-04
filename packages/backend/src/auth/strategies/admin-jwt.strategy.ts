import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { UserRole } from '@prisma/client';
import { isAdmin } from '../utils/auth.utils';

/**
 * Admin JWT-Payload-Interface
 */
import { AuthService } from '../auth.service';

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
 * JWT-Strategie für Admin-Tokens
 *
 * Diese Strategie extrahiert und validiert Admin-Tokens aus HTTP-Only Cookies.
 * Sie stellt sicher, dass nur Tokens mit isAdmin=true akzeptiert werden.
 */
@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.['adminToken'];
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_ADMIN_SECRET'),
    });
  }

  /**
   * Validiert das Admin-JWT-Payload
   *
   * @param payload - Das dekodierte JWT-Payload
   * @returns Der validierte Admin-Benutzer
   * @throws UnauthorizedException wenn der Benutzer kein Admin ist oder nicht mehr existiert
   */
  async validate(payload: AdminJwtPayload): Promise<ValidatedAdminUser> {
    if (!payload.role || !isAdmin(payload.role)) {
      throw new UnauthorizedException('Token is not an admin token');
    }

    // Prüfe ob der Benutzer noch in der Datenbank existiert
    const user = await this.authService.findUserById(payload.sub);

    if (!user) {
      throw new UnauthorizedException('User no longer exists');
    }

    // Prüfe ob der Benutzer immer noch Admin-Rechte hat
    if (!isAdmin(user.role)) {
      throw new UnauthorizedException('User is no longer an admin');
    }

    return {
      userId: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}
