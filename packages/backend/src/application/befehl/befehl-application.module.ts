import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { OutboxModule } from '@/infrastructure/outbox/outbox.module';
import { BEFEHL_REPOSITORY, LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';
import { PrismaBefehlRepository } from '@/infrastructure/repositories/prisma-befehl.repository';
import { CreateBefehlHandler } from './commands/create-befehl/create-befehl.handler';

/**
 * NestJS-Modul für Application Layer - Befehl Bounded Context.
 *
 * Dieses Modul registriert alle Command-Handler für Befehl-Management
 * und macht sie über Dependency Injection verfügbar (Hexagonal Architecture).
 *
 * **CQRS Pattern (Story 1.2):**
 * - Command Handlers: State Mutation (CreateBefehl)
 * - TransactionalCommandHandler: Atomare Persistierung + Event-Publikation
 *
 * **Transactional Outbox Pattern:**
 * - CreateBefehlHandler nutzt TransactionalCommandHandler Base Class
 * - Domain Events werden mit Aggregate in einer Transaktion committed
 * - Outbox Poller publiziert Events asynchron (BefehlErstelltEvent)
 *
 * **Module Dependencies:**
 * - PrismaModule: Database Connection für Repository
 * - OutboxModule: Transactional Outbox Infrastructure
 *
 * @example
 * ```typescript
 * // In Controller:
 * constructor(private readonly createHandler: CreateBefehlHandler) {}
 *
 * @Post()
 * async create(@Body() dto: CreateBefehlDto) {
 *   const command = new CreateBefehlCommand(...);
 *   const result = await this.createHandler.execute(command);
 *   if (result.isFailure) throw new BadRequestException(result.error);
 *   return this.mapToDto(befehl);
 * }
 * ```
 */
@Module({
  imports: [
    // Database Connection
    PrismaModule,
    // Outbox Infrastructure (Transactional Outbox Pattern)
    OutboxModule,
  ],
  providers: [
    // Logger für Befehl Handlers
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('Befehl'),
    },
    // Repository Implementation bound to Interface Token
    {
      provide: BEFEHL_REPOSITORY,
      useClass: PrismaBefehlRepository,
    },
    // Command Handlers (Story 1.2)
    CreateBefehlHandler,
  ],
  exports: [
    // Export handler for use in Infrastructure Layer (Controllers)
    CreateBefehlHandler,
    // Export repository token for use in BefehlController (findById after create)
    BEFEHL_REPOSITORY,
  ],
})
export class BefehlApplicationModule {}
