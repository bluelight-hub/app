import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { PrismaEinsatzRepository } from './repositories/prisma-einsatz.repository';
import { PrismaEinsatzRollenReadRepository } from './repositories/prisma-einsatz-rollen-read.repository';
import { PrismaOutboxRepository } from '@/infrastructure/outbox/prisma-outbox.repository';
import { EventSerializer } from '@/infrastructure/outbox/event-serializer';
import { EINSATZ_REPOSITORY, EINSATZ_ROLLEN_READ_REPOSITORY, LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '../common/adapters/nest-logger.adapter';

/**
 * NestJS Module für Einsatz Infrastructure Layer.
 *
 * Dieses Modul registriert die Infrastructure-Implementierungen
 * der Domain Repository Ports (Hexagonal Architecture Pattern).
 *
 * **Dependency Injection Strategy:**
 * - IEinsatzRepository wird als String Token bereitgestellt
 * - PrismaEinsatzRepository ist die konkrete Repository-Implementierung
 * - Application Layer kann das Interface injizieren via @Inject('IEinsatzRepository')
 *
 * **Warum String Token statt Class Token:**
 * - Domain Layer kennt NUR das Interface (IEinsatzRepository)
 * - Domain Layer kann NICHT auf Infrastructure Class referenzieren
 * - String Token entkoppelt Domain von Infrastructure
 * - Ermöglicht austauschbare Implementierungen (Prisma, In-Memory für Tests)
 *
 * **Module Dependencies:**
 * - PrismaModule: Stellt PrismaService für Repository zur Verfügung
 * - EventSerializer: Serialisiert Domain Events für Outbox Pattern
 * - PrismaOutboxRepository: Persistiert Events in outbox_events Tabelle (Transactional Outbox)
 *
 * **Transactional Outbox Pattern:**
 * - PrismaEinsatzRepository nutzt PrismaOutboxRepository für atomare Event-Persistierung
 * - Events werden mit Aggregate in einer Transaktion committed
 * - Garantiert: Keine Event-Loss durch Transaction Rollback
 *
 * @example
 * ```typescript
 * // In Application Layer Command Handler:
 * @Injectable()
 * export class CreateEinsatzCommandHandler {
 *   constructor(
 *     @Inject('IEinsatzRepository')
 *     private readonly einsatzRepository: IEinsatzRepository
 *   ) {}
 * }
 * ```
 */
@Module({
  imports: [PrismaModule],
  providers: [
    // Logger für Einsatz Infrastructure
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('EinsatzInfrastructure'),
    },

    // Outbox Infrastructure (Transactional Outbox Pattern)
    EventSerializer,
    PrismaOutboxRepository,
    {
      provide: OUTBOX_REPOSITORY,
      useClass: PrismaOutboxRepository,
    },

    // Repository Implementation bound to Interface Token
    {
      provide: EINSATZ_REPOSITORY,
      useClass: PrismaEinsatzRepository,
    },

    // Read-Only Rollen Repository (Story 4.3)
    {
      provide: EINSATZ_ROLLEN_READ_REPOSITORY,
      useClass: PrismaEinsatzRollenReadRepository,
    },
  ],
  exports: [
    // Export Interface Token for Application Layer injection
    EINSATZ_REPOSITORY,
    EINSATZ_ROLLEN_READ_REPOSITORY,
    OUTBOX_REPOSITORY,
  ],
})
export class EinsatzInfrastructureModule {}
