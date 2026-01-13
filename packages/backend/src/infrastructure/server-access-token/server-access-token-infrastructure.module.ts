import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { LOGGER, SERVER_ACCESS_TOKEN_REPOSITORY } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '../common/adapters/nest-logger.adapter';
import { PrismaServerAccessTokenRepository } from './repositories/prisma-server-access-token.repository';
import { ServerAccessGuard } from '../guards/server-access.guard';
import { ServerConfigInfrastructureModule } from '../server-config/server-config-infrastructure.module';

/**
 * NestJS Module fuer ServerAccessToken Infrastructure Layer.
 *
 * Registriert die Infrastructure-Implementierungen fuer Server-Access-Token
 * Authentifizierung (Hexagonal Architecture Pattern).
 *
 * **Global Module:**
 * Dieses Modul ist global, weil der ServerAccessGuard als APP_GUARD in
 * AppModule verwendet wird und somit global verfuegbar sein muss.
 *
 * **Dependency Injection Strategy:**
 * - IServerAccessTokenRepository wird als Symbol Token bereitgestellt
 * - PrismaServerAccessTokenRepository ist die konkrete Repository-Implementierung
 * - ServerAccessGuard nutzt das Repository zur Token-Validierung
 *
 * **Security Considerations:**
 * - Token-Hashes werden NIEMALS vollstaendig geloggt
 * - bcrypt.compare() fuer timing-safe Token-Validierung
 * - lastUsedAt Update erfolgt asynchron (non-blocking)
 *
 * @see ServerAccessGuard - Globaler Guard fuer API-Authentifizierung
 * @see PrismaServerAccessTokenRepository - Repository Implementation
 */
@Global()
@Module({
  imports: [PrismaModule, ServerConfigInfrastructureModule],
  providers: [
    // Logger fuer ServerAccessToken Infrastructure
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('ServerAccessTokenInfrastructure'),
    },

    // Repository Implementation bound to Interface Token
    PrismaServerAccessTokenRepository,
    {
      provide: SERVER_ACCESS_TOKEN_REPOSITORY,
      useClass: PrismaServerAccessTokenRepository,
    },

    // Guard (wird als APP_GUARD in AppModule registriert)
    ServerAccessGuard,
  ],
  exports: [
    // Export Token fuer DI in anderen Modulen
    SERVER_ACCESS_TOKEN_REPOSITORY,
    // Export Guard fuer APP_GUARD Registration in AppModule
    ServerAccessGuard,
  ],
})
export class ServerAccessTokenInfrastructureModule {}
