import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { BefehlApplicationModule } from '@/application/befehl/befehl-application.module';
import { BefehlsgeberVorschlagApplicationModule } from '@/application/befehlsgeber-vorschlag/befehlsgeber-vorschlag-application.module';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { ResilienceModule } from '@/infrastructure/resilience/resilience.module';
import { BefehlController } from './controllers/befehl.controller';
import { AdminBefehlsgeberVorschlaegeController } from './controllers/admin-befehlsgeber-vorschlaege.controller';
import { BefehlGateway } from './gateways/befehl.gateway';
import { BefehlRollenGuard } from '@/modules/common/guards/befehl-rollen.guard';
import { WsJwtAuthGuard } from '@/modules/erinnerung/guards/ws-jwt-auth.guard';

/**
 * Befehl-Modul für die Verwaltung von Befehlen (Hexagonal Architecture).
 *
 * Features (Story 1.2):
 * - Kurzbefehl erfassen mit POST /api/v-alpha/befehle
 * - TransactionalCommandHandler für atomare Persistierung + Events
 * - Automatische Befehlsnummer-Generierung (B-001, B-002, ...)
 * - Domain Events (BefehlErstelltEvent) via Transactional Outbox
 * - REST API mit Swagger-Dokumentation (@ApiWrappedCreatedResponse)
 *
 * Features (Story 1.3):
 * - WebSocket Gateway fuer Real-Time Befehl-Events
 * - JWT-Authentifizierung fuer WebSocket-Verbindungen
 *
 * **Architektur:**
 * - Controller nutzt direkt CreateBefehlHandler (kein CQRS Bus)
 * - Alle Business-Logik in Application Layer (BefehlApplicationModule)
 * - Repository Implementation über DI Token (BEFEHL_REPOSITORY)
 *
 * **Module-Dependencies:**
 * - BefehlApplicationModule: Command Handlers + Repository DI
 * - JwtModule: JWT-Validierung fuer WebSocket Auth
 *
 * @remarks
 * Die Kommunikation mit anderen Modulen erfolgt über
 * Domain-Events (Transactional Outbox Pattern).
 */
@Module({
  imports: [
    BefehlApplicationModule,
    BefehlsgeberVorschlagApplicationModule,
    PrismaModule,
    ResilienceModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
      }),
    }),
  ],
  controllers: [BefehlController, AdminBefehlsgeberVorschlaegeController],
  providers: [BefehlGateway, WsJwtAuthGuard, BefehlRollenGuard],
  exports: [BefehlGateway],
})
export class BefehlModule {}
