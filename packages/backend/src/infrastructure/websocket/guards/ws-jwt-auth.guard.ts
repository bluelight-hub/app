import { type CanActivate, Injectable, type ExecutionContext, UnauthorizedException } from '@nestjs/common';
import type { Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '@/modules/auth/strategies/jwt.strategy';
import { AppConfigService } from '@/infrastructure/services/app-config.service';

/**
 * WebSocket JWT Authentication Guard für das einsatzgebundene Event-Gateway.
 *
 * Validiert das JWT-Token aus `socket.handshake.auth.token` (Fallback: Cookie
 * `accessToken`) und annotiert den Socket mit `userId` + `role`. Bei Fehlern
 * wird die Verbindung getrennt.
 *
 * Identische Logik wie `modules/erinnerung/guards/ws-jwt-auth.guard.ts`,
 * aber als Infrastructure-Guard (verhindert Layer-Bruch
 * Infrastructure → Modules).
 */
@Injectable()
export class WsJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly appConfig: AppConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    let token = client.handshake.auth?.token as string | undefined;

    if (!token && client.handshake.headers.cookie) {
      const cookies = client.handshake.headers.cookie.split(';').reduce(
        (acc, cookie) => {
          const parts = cookie.trim().split('=');
          const key = parts.shift();
          const value = parts.join('=');
          if (key && value) {
            acc[key] = value;
          }
          return acc;
        },
        {} as Record<string, string>,
      );
      token = cookies.accessToken;
    }

    if (!token) {
      client.disconnect();
      throw new UnauthorizedException('No token provided');
    }

    try {
      const secret = this.appConfig.get<string>('JWT_SECRET');
      if (!secret) {
        client.disconnect();
        throw new UnauthorizedException('JWT_SECRET ist nicht im zentralen Secret-System konfiguriert');
      }

      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, { secret });
      client.data.userId = payload.sub;
      client.data.role = payload.role;
      return true;
    } catch {
      client.disconnect();
      throw new UnauthorizedException('Invalid token');
    }
  }
}
