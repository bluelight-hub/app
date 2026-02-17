import { Inject, Injectable, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, type OnGatewayConnection, type OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER } from '@infrastructure/di-tokens';
import { WsJwtAuthGuard } from '@/modules/erinnerung/guards/ws-jwt-auth.guard';
import type { JoinEinsatzDto } from '@/modules/erinnerung/dto/join-einsatz.dto';
import { corsConfig } from '@/infrastructure/config/security.config';

/**
 * WebSocket Payload fuer befehl.erstellt Event (AC6 - Event-Carried State Transfer).
 */
export interface BefehlErstelltPayload {
  befehlId: string;
  einsatzId: string;
  nummer: string;
  auftrag: string;
  befehlsgeberId: string;
  erstellerId: string;
  empfaengerIds: string[];
  status: string;
  erteiltAm: string; // ISO 8601
}

/**
 * WebSocket Payload fuer befehl.zugestellt Event.
 */
export interface BefehlZugestelltPayload {
  befehlId: string;
  einsatzId: string;
  empfaengerId: string;
  zugestelltAm: string; // ISO 8601
}

/**
 * WebSocket Payload fuer befehl.statusGeaendert Event.
 */
export interface BefehlStatusGeaendertPayload {
  befehlId: string;
  einsatzId: string;
  oldStatus: string;
  newStatus: string;
  timestamp: string; // ISO 8601
}

/**
 * WebSocket Payload fuer befehl.kommentarHinzugefuegt Event.
 */
export interface BefehlKommentarHinzugefuegtPayload {
  befehlId: string;
  einsatzId: string;
  kommentarId: string;
  authorId: string;
  text: string;
  isRueckfrage: boolean;
  parentId?: string;
  timestamp: string; // ISO 8601
}

/**
 * WebSocket Gateway fuer Befehle.
 *
 * **Story 1.3 AC2: WebSocket Events fuer Real-Time Updates**
 * - Emittiert Events wenn Befehle erstellt, zugestellt, Status geaendert oder kommentiert werden
 * - Alle Clients im Room `einsatz:{einsatzId}:befehle` erhalten die Events
 *
 * **Story 1.3 AC6: Event-Carried State Transfer**
 * - Payloads enthalten alle relevanten Daten fuer sofortige UI-Updates
 *
 * **Security (C1, C2, C3):**
 * - CORS: Nur FRONTEND_URL erlaubt (kein wildcard '*')
 * - Authentication: JWT Token bei Connection erforderlich (WsJwtAuthGuard)
 * - Authorization: einsatzId wird validiert (UUID v4 Format)
 * - Input Validation: JoinEinsatzDto mit class-validator
 *
 * **Room Pattern:**
 * - Clients joinen Room `einsatz:{einsatzId}:befehle` beim Connect
 * - Events werden an den Room gebroadcastet
 *
 * **Events:**
 * - `befehl.erstellt`: Neuer Befehl erstellt
 * - `befehl.zugestellt`: Befehl an Empfaenger zugestellt
 * - `befehl.statusGeaendert`: Befehlsstatus geaendert
 * - `befehl.kommentarHinzugefuegt`: Kommentar zu Befehl hinzugefuegt
 */
@Injectable()
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  namespace: '/befehle',
  cors: process.env.NODE_ENV === 'production' ? corsConfig.production : corsConfig.development,
})
export class BefehlGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    readonly _configService: ConfigService,
  ) {}

  /**
   * Handler fuer neue WebSocket-Verbindungen.
   *
   * **Security (C2):** JWT Token wird via WsJwtAuthGuard validiert.
   * `client.data.userId` und `client.data.role` sind nach erfolgreicher Auth gesetzt.
   *
   * @param client - WebSocket Client (authenticated via WsJwtAuthGuard)
   */
  handleConnection(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    this.logger.log(`Client connected: ${client.id}, userId: ${userId || 'unknown'}`, 'BefehlGateway');
  }

  /**
   * Handler fuer WebSocket-Verbindungstrennung.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`, 'BefehlGateway');
  }

  /**
   * Client joined einen Einsatz-Room fuer Befehle.
   *
   * **Security (C3):** Input Validation via JoinEinsatzDto.
   * - einsatzId MUSS UUID v4 Format sein (verhindert Room Traversal)
   * - ValidationPipe validiert automatisch vor Room-Join
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
    this.logger.log(`Client ${client.id} (userId: ${userId}) joined room ${roomName}`, 'BefehlGateway');
  }

  /**
   * Client verlaesst einen Einsatz-Room.
   *
   * **Security (C3):** Input Validation via JoinEinsatzDto.
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
    this.logger.log(`Client ${client.id} (userId: ${userId}) left room ${roomName}`, 'BefehlGateway');
  }

  /**
   * Emittiert `befehl.erstellt` Event an alle Clients im Einsatz-Room.
   *
   * **Story 1.3 AC6:** Event-Carried State Transfer - vollstaendige Befehlsdaten im Payload
   *
   * @param payload - Event-Payload mit allen Befehlsdaten
   */
  emitBefehlErstellt(payload: BefehlErstelltPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('befehl.erstellt', payload);
    this.logger.log(`Emitted befehl.erstellt to room ${roomName}: befehlId=${payload.befehlId}`, 'BefehlGateway');
  }

  /**
   * Emittiert `befehl.zugestellt` Event an alle Clients im Einsatz-Room.
   *
   * @param payload - Event-Payload mit Zustellungsinformationen
   */
  emitBefehlZugestellt(payload: BefehlZugestelltPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('befehl.zugestellt', payload);
    this.logger.log(`Emitted befehl.zugestellt to room ${roomName}: befehlId=${payload.befehlId}, empfaengerId=${payload.empfaengerId}`, 'BefehlGateway');
  }

  /**
   * Emittiert `befehl.statusGeaendert` Event an alle Clients im Einsatz-Room.
   *
   * @param payload - Event-Payload mit altem und neuem Status
   */
  emitBefehlStatusGeaendert(payload: BefehlStatusGeaendertPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('befehl.statusGeaendert', payload);
    this.logger.log(`Emitted befehl.statusGeaendert to room ${roomName}: befehlId=${payload.befehlId}, ${payload.oldStatus} -> ${payload.newStatus}`, 'BefehlGateway');
  }

  /**
   * Emittiert `befehl.kommentarHinzugefuegt` Event an alle Clients im Einsatz-Room.
   *
   * @param payload - Event-Payload mit Kommentardaten
   */
  emitBefehlKommentarHinzugefuegt(payload: BefehlKommentarHinzugefuegtPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('befehl.kommentarHinzugefuegt', payload);
    this.logger.log(`Emitted befehl.kommentarHinzugefuegt to room ${roomName}: befehlId=${payload.befehlId}, kommentarId=${payload.kommentarId}`, 'BefehlGateway');
  }

  /**
   * Generiert den Room-Namen fuer einen Einsatz.
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Room-Name im Format `einsatz:{einsatzId}:befehle`
   */
  private getRoomName(einsatzId: string): string {
    return `einsatz:${einsatzId}:befehle`;
  }
}
