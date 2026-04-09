import { Inject, Injectable, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, type OnGatewayConnection, type OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER, METRICS } from '@infrastructure/di-tokens';
import { WsJwtAuthGuard } from '@/modules/erinnerung/guards/ws-jwt-auth.guard';
import { JoinEinsatzDto } from '@/modules/erinnerung/dto/join-einsatz.dto';
import { SendFeatureCreatedDto, SendFeatureUpdatedDto, SendFeatureDeletedDto } from '../dto/send-feature-delta.dto';
import type { Gauge } from 'prom-client';
import { corsConfig } from '@/infrastructure/config/security.config';

/** Maximale Payload-Größe pro Feature (100 KB) */
const MAX_FEATURE_PAYLOAD_SIZE = 100 * 1024;

/**
 * WebSocket Payload für lagekarte.stateGeaendert Event.
 */
export interface LagekarteStateGeaendertPayload {
  einsatzId: string;
  lagekarteId: string;
  changedBy: string;
  timestamp: string; // ISO 8601
}

/**
 * WebSocket Gateway für Lagekarte Echtzeit-Kollaboration.
 *
 * **Issue #638: Lagekarte Echtzeit-Feature**
 * - Empfängt Feature-Deltas (Created/Updated/Deleted) von Clients
 * - Broadcastet Deltas an alle anderen Clients im selben Einsatz-Room
 * - Emittiert stateGeaendert Events (für Event-Adapter)
 *
 * **Security (C1, C2, C3):**
 * - CORS: Nur FRONTEND_URL erlaubt (kein Wildcard '*')
 * - Authentication: JWT Token bei Connection erforderlich (WsJwtAuthGuard)
 * - Authorization: einsatzId wird validiert (CUID2 Format)
 * - Input Validation: DTOs mit class-validator
 * - Payload Size Guard: max 100KB pro Feature
 *
 * **Room Pattern:**
 * - Clients joinen Room `einsatz:{einsatzId}:lagekarte` beim Connect
 * - Feature-Deltas werden an den Room gebroadcastet (except Sender)
 *
 * **Events (Client → Server):**
 * - `join:einsatz`: Client joined den Lagekarte-Room
 * - `leave:einsatz`: Client verlässt den Lagekarte-Room
 * - `lagekarte:feature.created`: Neues Feature erstellt
 * - `lagekarte:feature.updated`: Feature aktualisiert
 * - `lagekarte:feature.deleted`: Feature gelöscht
 *
 * **Events (Server → Client):**
 * - `lagekarte:feature.created`: Broadcast neues Feature
 * - `lagekarte:feature.updated`: Broadcast aktualisiertes Feature
 * - `lagekarte:feature.deleted`: Broadcast gelöschtes Feature
 * - `lagekarte:state.geaendert`: State wurde gespeichert (via Event-Adapter)
 */
@Injectable()
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  namespace: '/ws/v-alpha/lagekarte',
  cors: process.env.NODE_ENV === 'production' ? corsConfig.production : corsConfig.development,
})
export class LagekarteGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(METRICS.WS_CONNECTIONS) private readonly wsGauge: Gauge,
  ) {}

  /**
   * Handler für neue WebSocket-Verbindungen.
   *
   * @param client - WebSocket Client (authenticated via WsJwtAuthGuard)
   */
  handleConnection(client: Socket): void {
    this.wsGauge.inc({ namespace: '/ws/v-alpha/lagekarte' });
    const userId = client.data.userId as string | undefined;
    this.logger.log(`Client connected: ${client.id}, userId: ${userId || 'unknown'}`, 'LagekarteGateway');
  }

  /**
   * Handler für WebSocket-Verbindungstrennung.
   */
  handleDisconnect(client: Socket): void {
    this.wsGauge.dec({ namespace: '/ws/v-alpha/lagekarte' });
    this.logger.log(`Client disconnected: ${client.id}`, 'LagekarteGateway');
  }

  /**
   * Client joined den Lagekarte-Room für einen Einsatz.
   *
   * **Security (C3):** Input Validation via JoinEinsatzDto.
   * einsatzId MUSS CUID2 Format sein (verhindert Room Traversal).
   *
   * @param dto - Validiertes JoinEinsatzDto mit einsatzId
   * @param client - WebSocket Client (authenticated)
   */
  @SubscribeMessage('join:einsatz')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleJoinEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): void {
    const { einsatzId } = dto;
    const userId = client.data.userId as string;
    const roomName = this.getRoomName(einsatzId);
    client.join(roomName);
    this.logger.log(`Client ${client.id} (userId: ${userId}) joined room ${roomName}`, 'LagekarteGateway');
  }

  /**
   * Client verlässt den Lagekarte-Room.
   *
   * @param dto - Validiertes JoinEinsatzDto mit einsatzId
   * @param client - WebSocket Client
   */
  @SubscribeMessage('leave:einsatz')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleLeaveEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): void {
    const { einsatzId } = dto;
    const userId = client.data.userId as string;
    const roomName = this.getRoomName(einsatzId);
    client.leave(roomName);
    this.logger.log(`Client ${client.id} (userId: ${userId}) left room ${roomName}`, 'LagekarteGateway');
  }

  /**
   * Empfängt ein neues Feature und broadcastet es an alle anderen Clients.
   *
   * **Payload Size Guard:** Features über 100KB werden abgelehnt.
   *
   * @param dto - Validiertes SendFeatureCreatedDto
   * @param client - WebSocket Client (Sender wird vom Broadcast ausgeschlossen)
   */
  @SubscribeMessage('lagekarte:feature.created')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleFeatureCreated(@MessageBody() dto: SendFeatureCreatedDto, @ConnectedSocket() client: Socket): void {
    if (!this.validatePayloadSize(dto.feature, client.id)) {
      return;
    }

    const roomName = this.getRoomName(dto.einsatzId);
    this.server.to(roomName).except(client.id).emit('lagekarte:feature.created', {
      einsatzId: dto.einsatzId,
      feature: dto.feature,
      timestamp: dto.timestamp,
      senderId: client.data.userId,
    });
    this.logger.log(`Feature created broadcast to room ${roomName} by client ${client.id}`, 'LagekarteGateway');
  }

  /**
   * Empfängt aktualisierte Features und broadcastet sie an alle anderen Clients.
   *
   * **Payload Size Guard:** Features über 100KB werden abgelehnt.
   *
   * @param dto - Validiertes SendFeatureUpdatedDto
   * @param client - WebSocket Client (Sender wird vom Broadcast ausgeschlossen)
   */
  @SubscribeMessage('lagekarte:feature.updated')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleFeatureUpdated(@MessageBody() dto: SendFeatureUpdatedDto, @ConnectedSocket() client: Socket): void {
    for (const feature of dto.features) {
      if (!this.validatePayloadSize(feature, client.id)) {
        return;
      }
    }

    const roomName = this.getRoomName(dto.einsatzId);
    this.server.to(roomName).except(client.id).emit('lagekarte:feature.updated', {
      einsatzId: dto.einsatzId,
      features: dto.features,
      timestamp: dto.timestamp,
      senderId: client.data.userId,
    });
    this.logger.log(`Feature updated broadcast to room ${roomName} by client ${client.id} (${dto.features.length} features)`, 'LagekarteGateway');
  }

  /**
   * Empfängt gelöschte Feature-IDs und broadcastet sie an alle anderen Clients.
   *
   * @param dto - Validiertes SendFeatureDeletedDto
   * @param client - WebSocket Client (Sender wird vom Broadcast ausgeschlossen)
   */
  @SubscribeMessage('lagekarte:feature.deleted')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleFeatureDeleted(@MessageBody() dto: SendFeatureDeletedDto, @ConnectedSocket() client: Socket): void {
    const roomName = this.getRoomName(dto.einsatzId);
    this.server.to(roomName).except(client.id).emit('lagekarte:feature.deleted', {
      einsatzId: dto.einsatzId,
      featureIds: dto.featureIds,
      timestamp: dto.timestamp,
      senderId: client.data.userId,
    });
    this.logger.log(`Feature deleted broadcast to room ${roomName} by client ${client.id} (${dto.featureIds.length} features)`, 'LagekarteGateway');
  }

  /**
   * Emittiert `lagekarte:state.geaendert` Event an alle Clients im Einsatz-Room.
   *
   * Wird vom LagekarteStateGeaendertWebsocketEventAdapter aufgerufen,
   * wenn ein LagekarteStateGeaendertEvent empfangen wird.
   *
   * @param payload - Event-Payload mit Lagekarte-State-Informationen
   */
  emitStateGeaendert(payload: LagekarteStateGeaendertPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('lagekarte:state.geaendert', payload);
    this.logger.log(`Emitted lagekarte:state.geaendert to room ${roomName}: lagekarteId=${payload.lagekarteId}`, 'LagekarteGateway');
  }

  /**
   * Prüft ob die Payload-Größe eines Features die Maximalgröße überschreitet.
   *
   * @param feature - Das zu prüfende Feature-Objekt
   * @param clientId - Client-ID für Logging
   * @returns true wenn Größe akzeptabel, false wenn zu groß
   */
  private validatePayloadSize(feature: object, clientId: string): boolean {
    const payloadSize = Buffer.byteLength(JSON.stringify(feature), 'utf8');
    if (payloadSize > MAX_FEATURE_PAYLOAD_SIZE) {
      this.logger.warn(`Feature payload too large (${payloadSize} bytes, max ${MAX_FEATURE_PAYLOAD_SIZE} bytes) from client ${clientId}`, 'LagekarteGateway');
      return false;
    }
    return true;
  }

  /**
   * Generiert den Room-Namen für einen Einsatz.
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Room-Name im Format `einsatz:{einsatzId}:lagekarte`
   */
  private getRoomName(einsatzId: string): string {
    return `einsatz:${einsatzId}:lagekarte`;
  }
}
