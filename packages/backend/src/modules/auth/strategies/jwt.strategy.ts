import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JWTPayload } from '../types/jwt.types';
import { Request } from 'express';

/**
 * JWT authentication strategy for validating access tokens.
 * Extracts and validates JWT tokens from Authorization header.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
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

  async validate(payload: JWTPayload): Promise<JWTPayload> {
    if (!payload.sub || !payload.email || !payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // TODO: Validate session is still active in database
    // const session = await this.authService.validateSession(payload.sessionId);
    // if (!session) {
    //   throw new UnauthorizedException('Session expired or invalid');
    // }

    return payload;
  }
}