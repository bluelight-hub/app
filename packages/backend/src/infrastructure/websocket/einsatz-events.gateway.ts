// @ts-nocheck
import { Inject, Injectable, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, type OnGatewayConnection, type OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';

import type { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { corsConfig } from '@/infrastructure/config/security.config';
import { WsJwtAuthGuard } from './guards/ws-jwt-auth.guard';
import { JoinEinsatzDto } from './dto/join-einsatz.dto';
import type { EinsatzEventName } from './events/einsatz-event.types';

/**
 * Fehler-Payload für fehlgeschlagene `join:einsatz`-Versuche.
 */
export interface JoinEinsatzErrorPayload {
  code: 'EINSATZ_WS_JOIN_FORBIDDEN' | 'EINSATZ_WS_JOIN_ACCESS_CHECK_FAILED';
  message: string;
  einsatzId: string;
}

/**
 * Einsatz-gebundenes WebSocket-Gateway (Issue #407, Task 18).
 *
 * Verwaltet Rooms `einsatz:{einsatzId}` für alle Funkverkehr-Broadcasts
 * (Funkkanal-Events, Funkspruch-ETB-Einträge, Notfall-Alerts).
 *
 * **Authentifizierung:** {@link WsJwtAuthGuard} validiert das JWT bei
 * Connection. **Autorisierung:** Nur aktive Einsatzteilnehmer dürfen joinen.
 *
 * **Broadcast-Mechanismen:**
 * - {@link broadcastToEinsatz} — direkter Broadcast an einen Einsatz-Room.
 * - {@link broadcastByEtb} — resolved zuerst etbId → einsatzId via
 *   `IEtbRepository` (siehe Publisher) und broadcastet anschließend in den
 *   passenden Einsatz-Room.
 */
@Injectable()
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  namespace: '/ws/einsatz-events',
  cors: process.env.NODE_ENV === 'production' ? corsConfig.production : corsConfig.development,
})
export class EinsatzEventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly einsatzTeilnehmerRepository: IEinsatzTeilnehmerRepository,
  ) {}

  handleConnection(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    this.logger.log(`Client connected: ${client.id}, userId: ${userId ?? 'unknown'}`, 'EinsatzEventsGateway');
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`, 'EinsatzEventsGateway');
  }

  /**
   * Client betritt den Einsatz-Room. Prüft Teilnahme via
   * `IEinsatzTeilnehmerRepository.findByEinsatzAndUser`.
   */
  @SubscribeMessage('join:einsatz')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleJoinEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): Promise<void> {
    const { einsatzId } = dto;
    const userId = client.data.userId as string;

    const access = await this.checkJoinAccess(userId, einsatzId);
    if (!access.allowed) {
      const payload: JoinEinsatzErrorPayload =
        access.reason === 'FORBIDDEN'
          ? { code: 'EINSATZ_WS_JOIN_FORBIDDEN', message: 'Keine Berechtigung für diesen Einsatz', einsatzId }
          : { code: 'EINSATZ_WS_JOIN_ACCESS_CHECK_FAILED', message: 'Berechtigungsprüfung fehlgeschlagen', einsatzId };
      client.emit('join:einsatz:error', payload);
      if (access.reason === 'FORBIDDEN') {
        this.logger.warn(`Forbidden join:einsatz attempt by user ${userId} for einsatz ${einsatzId}`, 'EinsatzEventsGateway');
      }
      return;
    }

    const room = this.getRoomName(einsatzId);
    client.join(room);
    this.logger.log(`Client ${client.id} (userId: ${userId}) joined room ${room}`, 'EinsatzEventsGateway');
  }

  @SubscribeMessage('leave:einsatz')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleLeaveEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): void {
    const room = this.getRoomName(dto.einsatzId);
    client.leave(room);
    this.logger.log(`Client ${client.id} left room ${room}`, 'EinsatzEventsGateway');
  }

  /**
   * Broadcastet ein Event an alle Clients im Einsatz-Room.
   */
  broadcastToEinsatz(einsatzId: string, channel: EinsatzEventName, payload: Record<string, unknown>): void {
    const room = this.getRoomName(einsatzId);
    this.server.to(room).emit(channel, payload);
    this.logger.debug?.(`Broadcast '${channel}' → ${room}`, 'EinsatzEventsGateway');
  }

  private async checkJoinAccess(userId: string, einsatzId: string): Promise<{ allowed: true } | { allowed: false; reason: 'FORBIDDEN' | 'CHECK_FAILED' }> {
    try {
      const teilnahme = await this.einsatzTeilnehmerRepository.findByEinsatzAndUser(einsatzId, userId);
      return teilnahme ? { allowed: true } : { allowed: false, reason: 'FORBIDDEN' };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Join access check failed for user ${userId} on einsatz ${einsatzId}: ${message}`, 'EinsatzEventsGateway');
      return { allowed: false, reason: 'CHECK_FAILED' };
    }
  }

  private getRoomName(einsatzId: string): string {
    return `einsatz:${einsatzId}`;
  }
}
