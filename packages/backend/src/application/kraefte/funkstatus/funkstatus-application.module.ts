import { Module } from '@nestjs/common';
import { KraefteInfrastructureModule } from '@infrastructure/kraefte/kraefte-infrastructure.module';
import { OutboxModule } from '@infrastructure/outbox/outbox.module';

// Command Handlers
import { UpdateFunkStatusConfigHandler } from './commands/update-funk-status-config/update-funk-status-config.handler';

// Query Handlers
import { GetAllFunkStatusConfigsHandler } from './queries/get-all-funk-status-configs.handler';
import { GetFunkStatusConfigByCodeHandler } from './queries/get-funk-status-config-by-code.handler';

/**
 * Application Module für FunkStatusConfig-Verwaltung.
 *
 * Registriert Command und Query Handlers für FunkStatusConfig.
 *
 * **Config-Only Pattern:**
 * - KEIN CreateHandler (FunkStatusConfig wird via Seed erstellt)
 * - KEIN DeleteHandler (Permanente System-Konfiguration)
 * - NUR UpdateHandler für Status 7-9 (editierbare Status)
 */
@Module({
  imports: [
    // Infrastructure Module für Repository DI
    KraefteInfrastructureModule,
    // Outbox Module für TransactionalCommandHandler
    OutboxModule,
  ],
  providers: [
    // Command Handlers
    UpdateFunkStatusConfigHandler,
    // Query Handlers
    GetAllFunkStatusConfigsHandler,
    GetFunkStatusConfigByCodeHandler,
  ],
  exports: [
    // Export Handlers für Controller
    UpdateFunkStatusConfigHandler,
    GetAllFunkStatusConfigsHandler,
    GetFunkStatusConfigByCodeHandler,
  ],
})
export class FunkStatusApplicationModule {}
