import { Global, Module } from '@nestjs/common';
import { PrismaServerConfigRepository } from './repositories/prisma-server-config.repository';
import { LOGGER, SERVER_CONFIG_REPOSITORY } from '@/infrastructure/di-tokens';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { NestLoggerAdapter } from '../common/adapters/nest-logger.adapter';

/**
 * Infrastructure Module fuer Server-Konfiguration.
 *
 * Stellt das IServerConfigRepository via DI Token bereit.
 *
 * **Verwendung:**
 * ```typescript
 * // In anderen Modulen importieren
 * @Module({
 *   imports: [ServerConfigInfrastructureModule],
 * })
 * export class MyModule {}
 *
 * // In Services/Controllers injizieren
 * constructor(
 *   @Inject(SERVER_CONFIG_REPOSITORY) private readonly configRepo: IServerConfigRepository
 * ) {}
 * ```
 *
 * **Bereitgestellte Provider:**
 * - `IServerConfigRepository` via `SERVER_CONFIG_REPOSITORY` Token
 *
 * **Dependencies:**
 * - PrismaModule: PrismaService fuer DB-Zugriff
 */
@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('ServerConfigInfrastructure'),
    },
    {
      provide: SERVER_CONFIG_REPOSITORY,
      useClass: PrismaServerConfigRepository,
    },
  ],
  exports: [SERVER_CONFIG_REPOSITORY],
})
export class ServerConfigInfrastructureModule {}
