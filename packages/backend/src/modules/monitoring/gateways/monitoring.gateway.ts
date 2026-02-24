import { Inject, Injectable, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, type OnGatewayConnection, type OnGatewayDisconnect, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { ILogger } from '@domain/ports/i-logger.port';
import { LOGGER, METRICS } from '@infrastructure/di-tokens';
import { WsJwtAuthGuard } from '@/modules/erinnerung/guards/ws-jwt-auth.guard';
import { corsConfig } from '@/infrastructure/config/security.config';
import type { Gauge } from 'prom-client';

/**
 * WebSocket Payload fuer system.warnung Event.
 */
export interface SystemWarnungPayload {
  warnungTyp: string;
  schwellwert: number;
  aktuellerWert: number;
  timestamp: string; // ISO 8601
}

/**
 * WebSocket Payload fuer system.health_changed Event.
 */
export interface SystemHealthChangedPayload {
  zustellrate: number;
  websocketConnections: number;
  outboxQueueDepth: number;
  timestamp: string; // ISO 8601
}

/**
 * WebSocket Gateway fuer System-Monitoring.
 *
 * **Story 5.6 AC3 + AC4: Echtzeit-Monitoring via WebSocket**
 * - Namespace: /ws/v-alpha/monitoring
 * - Room: 'system:health' fuer Admin-Monitoring
 * - Events: 'system.warnung', 'system.health_changed'
 *
 * **Security:**
 * - CORS: Nur FRONTEND_URL erlaubt
 * - Authentication: JWT Token bei Connection (WsJwtAuthGuard)
 */
@Injectable()
@UseGuards(WsJwtAuthGuard)
@WebSocketGateway({
  namespace: '/ws/v-alpha/monitoring',
  cors: process.env.NODE_ENV === 'production' ? corsConfig.production : corsConfig.development,
})
export class MonitoringGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    @Inject(LOGGER) private readonly logger: ILogger,
    @Inject(METRICS.WS_CONNECTIONS) private readonly wsGauge: Gauge<string>,
  ) {}

  /**
   * Handler fuer neue WebSocket-Verbindungen.
   * Client wird automatisch in den system:health Room gejoint.
   */
  handleConnection(client: Socket): void {
    const userId = client.data.userId as string | undefined;
    client.join('system:health');
    this.wsGauge.inc({ namespace: '/ws/v-alpha/monitoring' });
    this.logger.log(`Monitoring client connected: ${client.id}, userId: ${userId || 'unknown'}`, 'MonitoringGateway');
  }

  /**
   * Handler fuer WebSocket-Verbindungstrennung.
   */
  handleDisconnect(client: Socket): void {
    this.wsGauge.dec({ namespace: '/ws/v-alpha/monitoring' });
    this.logger.log(`Monitoring client disconnected: ${client.id}`, 'MonitoringGateway');
  }

  /**
   * Client joined den Monitoring-Room explizit.
   */
  @SubscribeMessage('join:monitoring')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  handleJoinMonitoring(@ConnectedSocket() client: Socket): void {
    client.join('system:health');
    this.logger.log(`Client ${client.id} joined monitoring room`, 'MonitoringGateway');
  }

  /**
   * Emittiert system.warnung Event an alle Monitoring-Clients.
   *
   * Story 5.6 AC3: Warnung bei Schwellwertueberschreitung.
   */
  emitSystemWarnung(payload: SystemWarnungPayload): void {
    this.server.to('system:health').emit('system.warnung', payload);
    this.logger.log(`Emitted system.warnung: ${payload.warnungTyp} = ${payload.aktuellerWert} (Schwelle: ${payload.schwellwert})`, 'MonitoringGateway');
  }

  /**
   * Emittiert system.health_changed Event an alle Monitoring-Clients.
   *
   * Story 5.6 AC4: Echtzeit-Updates fuer Dashboard.
   */
  emitHealthChanged(payload: SystemHealthChangedPayload): void {
    this.server.to('system:health').emit('system.health_changed', payload);
  }
}
