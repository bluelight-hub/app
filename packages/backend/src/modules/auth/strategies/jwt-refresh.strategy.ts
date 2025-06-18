import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JWTRefreshPayload } from '../types/jwt.types';
import { Request } from 'express';

/**
 * JWT refresh token strategy for validating refresh tokens.
 * Extracts refresh tokens from request body for token renewal.
 */
@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromBodyField('refreshToken'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: Request, payload: JWTRefreshPayload): Promise<JWTRefreshPayload> {
    const refreshToken = req.body?.refreshToken;
    
    if (!refreshToken || !payload.sub || !payload.sessionId || !payload.jti) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // TODO: Validate refresh token exists in database and matches session
    // const session = await this.authService.validateRefreshToken(refreshToken, payload.sessionId);
    // if (!session) {
    //   throw new UnauthorizedException('Refresh token expired or invalid');
    // }

    return payload;
  }
}