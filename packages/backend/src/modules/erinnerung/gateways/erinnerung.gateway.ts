// @ts-nocheck
import { Inject, Injectable, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, type OnGatewayConnection, type OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import { ILogger } from '@domain/ports/i-logger.port';
import type { IEinsatzTeilnehmerRepository } from '@domain/repositories/i-einsatz-teilnehmer.repository';
import { EINSATZ_TEILNEHMER_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { WsJwtAuthGuard } from '../guards/ws-jwt-auth.guard';
import type { JoinEinsatzDto } from '../dto/join-einsatz.dto';

/**
 * WebSocket Payload fuer erinnerung.triggered Event (Story 1.5 AC4).
 */
export interface ErinnerungTriggeredPayload {
  erinnerungId: string;
  einsatzId: string;
  titel: string;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.created Event.
 *
 * **Story 3.3:** Erweitert um assignedToId/assignedToName fuer Team-Zuweisung.
 */
export interface ErinnerungCreatedPayload {
  erinnerungId: string;
  einsatzId: string;
  titel: string;
  faelligAm: string;
  /** Story 3.3: ID des Erstellers */
  erstelltVon: string;
  /** Story 3.3: Name des Erstellers */
  erstellerName: string;
  /** Story 3.3: ID des zugewiesenen Users (optional) */
  assignedToId: string | null;
  /** Story 3.3: Name des zugewiesenen Users (optional) */
  assignedToName: string | null;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.updated Event.
 */
export interface ErinnerungUpdatedPayload {
  erinnerungId: string;
  einsatzId: string;
  titel: string;
  faelligAm: string;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.deleted Event.
 */
export interface ErinnerungDeletedPayload {
  erinnerungId: string;
  einsatzId: string;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.acknowledged Event (Story 1.6 AC2).
 */
export interface ErinnerungAcknowledgedPayload {
  erinnerungId: string;
  einsatzId: string;
  acknowledgedBy: string;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.snoozed Event (Story 2.1 AC2).
 */
export interface ErinnerungSnoozedPayload {
  erinnerungId: string;
  einsatzId: string;
  snoozedBy: string;
  snoozedUntil: string;
  snoozeMinutes: number;
  snoozeCount: number;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.retriggered Event (Story 2.2 AC4).
 */
export interface ErinnerungRetriggeredPayload {
  erinnerungId: string;
  einsatzId: string;
  titel: string;
  snoozeCount: number;
  isRetrigger: true;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.assigned Event (Story 3.4).
 */
export interface ErinnerungAssignedPayload {
  erinnerungId: string;
  einsatzId: string;
  assignedToId: string;
  assignedToName: string;
  assignedById: string;
  assignedByName: string;
  titel: string;
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.escalated Event (Story 4.1).
 */
export interface ErinnerungEscalatedPayload {
  erinnerungId: string;
  einsatzId: string;
  eskalationsPersonId: string | null;
  eskalationsPersonName: string | null;
  titel: string;
  /** ID des ursprünglichen Erstellers (für Frontend-Logik) */
  erstelltVon: string;
  /** Zeitpunkt der Eskalation (ISO-String) */
  eskaliertAm: string;
  /** @deprecated Nutze `eskaliertAm` stattdessen */
  timestamp: string;
}

/**
 * WebSocket Payload fuer erinnerung.intensified Event (Story 4.1 AC2).
 */
export interface ErinnerungIntensifiedPayload {
  erinnerungId: string;
  einsatzId: string;
  titel: string;
  timestamp: string;
}

/**
 * Fehler-Payload fuer fehlgeschlagene `join:einsatz` Requests.
 */
export interface JoinEinsatzErrorPayload {
  code: 'ERINNERUNG_WS_JOIN_FORBIDDEN' | 'ERINNERUNG_WS_JOIN_ACCESS_CHECK_FAILED';
  message: string;
  einsatzId: string;
}

/**
 * WebSocket Gateway fuer Erinnerungen.
 *
 * **Story 1.5 AC4: WebSocket Event fuer Team-Sync**
 * - Emittiert `erinnerung.triggered` wenn eine Erinnerung ausgeloest wird
 * - Alle Clients im Room `einsatz:{einsatzId}:erinnerungen` erhalten das Event
 *
 * **Security (C1, C2, C3):**
 * - CORS: Nur FRONTEND_URL erlaubt (kein wildcard '*')
 * - Authentication: JWT Token bei Connection erforderlich (WsJwtAuthGuard)
 * - Authorization: Nur aktive Einsatzteilnehmer duerfen `join:einsatz`
 * - Input Validation: JoinEinsatzDto mit class-validator
 *
 * **Room Pattern:**
 * - Clients joinen Room `einsatz:{einsatzId}:erinnerungen` beim Connect
 * - Events werden an den Room gebroadcastet
 *
 * **Events:**
 * - `erinnerung.triggered`: Erinnerung wurde ausgeloest (Story 1.5)
 * - `erinnerung.created`: Neue Erinnerung erstellt
 * - `erinnerung.updated`: Erinnerung aktualisiert
 * - `erinnerung.deleted`: Erinnerung gelöscht
 * - `join:einsatz:error`: Room-Join abgelehnt (fehlende Berechtigung/Prueffehler)
 */
import { corsConfig } from '@/infrastructure/config/security.config';

@Injectable()
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  namespace: '/erinnerungen',
  cors: process.env.NODE_ENV === 'production' ? corsConfig.production : corsConfig.development,
})
export class ErinnerungGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(EINSATZ_TEILNEHMER_REPOSITORY)
    private readonly einsatzTeilnehmerRepository: IEinsatzTeilnehmerRepository,
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
    this.logger.log(`Client connected: ${client.id}, userId: ${userId || 'unknown'}`, 'ErinnerungGateway');
  }

  /**
   * Handler fuer WebSocket-Verbindungstrennung.
   */
  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`, 'ErinnerungGateway');
  }

  /**
   * Client joined einen Einsatz-Room fuer Erinnerungen.
   *
   * **Security (C3):** Input Validation via JoinEinsatzDto.
   * - einsatzId MUSS CUID2 Format sein (verhindert Room Traversal)
   * - ValidationPipe validiert automatisch vor Room-Join
   *
   * **Authorization (C2):** Nur aktive Einsatzteilnehmer duerfen joinen.
   * Bei fehlender Berechtigung wird `join:einsatz:error` an den Client emittiert.
   *
   * @param dto - Validiertes JoinEinsatzDto mit einsatzId
   * @param client - WebSocket Client (authenticated)
   */
  @SubscribeMessage('join:einsatz')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async handleJoinEinsatz(@MessageBody() dto: JoinEinsatzDto, @ConnectedSocket() client: Socket): Promise<void> {
    const { einsatzId } = dto;
    const userId = client.data.userId as string;

    const accessResult = await this.checkJoinAccess(userId, einsatzId);
    if (!accessResult.allowed) {
      const errorPayload: JoinEinsatzErrorPayload =
        accessResult.reason === 'FORBIDDEN'
          ? {
              code: 'ERINNERUNG_WS_JOIN_FORBIDDEN',
              message: 'Keine Berechtigung fuer diesen Einsatz',
              einsatzId,
            }
          : {
              code: 'ERINNERUNG_WS_JOIN_ACCESS_CHECK_FAILED',
              message: 'Berechtigungspruefung fehlgeschlagen',
              einsatzId,
            };

      this.emitJoinError(client, errorPayload);

      if (accessResult.reason === 'FORBIDDEN') {
        this.logger.warn(`Forbidden join:einsatz attempt by user ${userId} for einsatz ${einsatzId}`, 'ErinnerungGateway');
      }
      return;
    }

    const roomName = this.getRoomName(einsatzId);
    client.join(roomName);
    this.logger.log(`Client ${client.id} (userId: ${userId}) joined room ${roomName}`, 'ErinnerungGateway');
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
    this.logger.log(`Client ${client.id} (userId: ${userId}) left room ${roomName}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.triggered` Event an alle Clients im Einsatz-Room.
   *
   * **Story 1.5 AC4:** WebSocket Event fuer Team-Sync
   *
   * @param payload - Event-Payload mit erinnerungId, einsatzId, titel, timestamp
   */
  emitErinnerungTriggered(payload: ErinnerungTriggeredPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.triggered', payload);
    this.logger.log(`Emitted erinnerung.triggered to room ${roomName}: erinnerungId=${payload.erinnerungId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.created` Event an alle Clients im Einsatz-Room.
   *
   * @param payload - Event-Payload
   */
  emitErinnerungCreated(payload: ErinnerungCreatedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.created', payload);
    this.logger.log(`Emitted erinnerung.created to room ${roomName}: erinnerungId=${payload.erinnerungId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.updated` Event an alle Clients im Einsatz-Room.
   *
   * @param payload - Event-Payload
   */
  emitErinnerungUpdated(payload: ErinnerungUpdatedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.updated', payload);
    this.logger.log(`Emitted erinnerung.updated to room ${roomName}: erinnerungId=${payload.erinnerungId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.deleted` Event an alle Clients im Einsatz-Room.
   *
   * @param payload - Event-Payload
   */
  emitErinnerungDeleted(payload: ErinnerungDeletedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.deleted', payload);
    this.logger.log(`Emitted erinnerung.deleted to room ${roomName}: erinnerungId=${payload.erinnerungId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.acknowledged` Event an alle Clients im Einsatz-Room.
   *
   * **Story 1.6 AC2:** WebSocket Event fuer Team-Sync bei Bestaetigung
   *
   * @param payload - Event-Payload mit erinnerungId, einsatzId, acknowledgedBy, timestamp
   */
  emitErinnerungAcknowledged(payload: ErinnerungAcknowledgedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.acknowledged', payload);
    this.logger.log(`Emitted erinnerung.acknowledged to room ${roomName}: erinnerungId=${payload.erinnerungId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.snoozed` Event an alle Clients im Einsatz-Room.
   *
   * **Story 2.1 AC2:** WebSocket Event fuer Team-Sync bei Snooze
   *
   * @param payload - Event-Payload mit erinnerungId, einsatzId, snoozedBy, snoozedUntil, snoozeMinutes, snoozeCount, timestamp
   */
  emitErinnerungSnoozed(payload: ErinnerungSnoozedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.snoozed', payload);
    this.logger.log(`Emitted erinnerung.snoozed to room ${roomName}: erinnerungId=${payload.erinnerungId}, snoozeMinutes=${payload.snoozeMinutes}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.retriggered` Event an alle Clients im Einsatz-Room.
   *
   * **Story 2.2 AC4:** WebSocket Event fuer Team-Sync bei erneuter Ausloesung nach Snooze
   *
   * @param payload - Event-Payload mit erinnerungId, einsatzId, titel, snoozeCount, isRetrigger, timestamp
   */
  emitErinnerungRetriggered(payload: ErinnerungRetriggeredPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.retriggered', payload);
    this.logger.log(`Emitted erinnerung.retriggered to room ${roomName}: erinnerungId=${payload.erinnerungId}, snoozeCount=${payload.snoozeCount}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.assigned` Event an alle Clients im Einsatz-Room.
   *
   * **Story 3.4:** WebSocket Event fuer Team-Sync bei Zuweisung einer bestehenden Erinnerung
   *
   * @param payload - Event-Payload mit erinnerungId, einsatzId, assignedToId, assignedToName, assignedById, assignedByName, titel, timestamp
   */
  emitErinnerungAssigned(payload: ErinnerungAssignedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.assigned', payload);
    this.logger.log(`Emitted erinnerung.assigned to room ${roomName}: erinnerungId=${payload.erinnerungId}, assignedTo=${payload.assignedToId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.escalated` Event an alle Clients im Einsatz-Room.
   *
   * **Story 4.1:** WebSocket Event bei Eskalation
   *
   * @param payload - Event-Payload
   */
  emitErinnerungEscalated(payload: ErinnerungEscalatedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.escalated', payload);
    this.logger.log(`Emitted erinnerung.escalated to room ${roomName}: erinnerungId=${payload.erinnerungId}, eskalationsPerson=${payload.eskalationsPersonId}`, 'ErinnerungGateway');
  }

  /**
   * Emittiert `erinnerung.intensified` Event an alle Clients im Einsatz-Room.
   *
   * **Story 4.1 AC2:** WebSocket Event bei Intensivierung
   *
   * @param payload - Event-Payload
   */
  emitErinnerungIntensified(payload: ErinnerungIntensifiedPayload): void {
    const roomName = this.getRoomName(payload.einsatzId);
    this.server.to(roomName).emit('erinnerung.intensified', payload);
    this.logger.log(`Emitted erinnerung.intensified to room ${roomName}: erinnerungId=${payload.erinnerungId}`, 'ErinnerungGateway');
  }

  /**
   * Prueft, ob ein User den Einsatz-Room betreten darf.
   *
   * Zugriff ist nur fuer aktive Einsatzteilnehmer erlaubt.
   */
  private async checkJoinAccess(userId: string, einsatzId: string): Promise<{ allowed: true } | { allowed: false; reason: 'FORBIDDEN' | 'CHECK_FAILED' }> {
    try {
      const teilnahme = await this.einsatzTeilnehmerRepository.findByEinsatzAndUser(einsatzId, userId);
      return teilnahme ? { allowed: true } : { allowed: false, reason: 'FORBIDDEN' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Join access check failed for user ${userId} on einsatz ${einsatzId}: ${errorMessage}`, 'ErinnerungGateway');
      return { allowed: false, reason: 'CHECK_FAILED' };
    }
  }

  /**
   * Emittiert einen standardisierten Join-Fehler an den anfragenden Client.
   */
  private emitJoinError(client: Socket, payload: JoinEinsatzErrorPayload): void {
    client.emit('join:einsatz:error', payload);
  }

  /**
   * Generiert den Room-Namen fuer einen Einsatz.
   *
   * @param einsatzId - ID des Einsatzes
   * @returns Room-Name im Format `einsatz:{einsatzId}:erinnerungen`
   */
  private getRoomName(einsatzId: string): string {
    return `einsatz:${einsatzId}:erinnerungen`;
  }
}
