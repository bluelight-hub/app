import { Module } from '@nestjs/common';
import { PrismaModule } from '@/infrastructure/database/prisma.module';
import { INVITE_CODE_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { NestLoggerAdapter } from '@infrastructure/common/adapters';
import { PrismaInviteCodeRepository } from './repositories/prisma-invite-code.repository';

/**
 * NestJS Module fuer InviteCode Infrastructure Layer.
 *
 * Registriert die Infrastructure-Implementierungen fuer InviteCode
 * Persistenz (Hexagonal Architecture Pattern).
 *
 * **Dependency Injection Strategy:**
 * - IInviteCodeRepository wird als Symbol Token bereitgestellt
 * - PrismaInviteCodeRepository ist die konkrete Repository-Implementierung
 * - Logger wird global bereitgestellt (nicht in diesem Modul)
 *
 * **Usage:**
 * Importiere dieses Modul in Modulen, die InviteCode-Persistenz benoetigen.
 *
 * @example
 * ```typescript
 * @Module({
 *   imports: [InviteCodeInfrastructureModule],
 *   providers: [CreateInviteCodeHandler],
 * })
 * export class InviteCodeModule {}
 * ```
 *
 * @see PrismaInviteCodeRepository - Repository Implementation
 * @see IInviteCodeRepository - Domain Port Interface
 */
@Module({
  imports: [PrismaModule],
  providers: [
    // Logger für InviteCode Infrastructure
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('InviteCodeInfrastructure'),
    },

    // Repository Implementation bound to Interface Token
    PrismaInviteCodeRepository,
    {
      provide: INVITE_CODE_REPOSITORY,
      useClass: PrismaInviteCodeRepository,
    },
  ],
  exports: [
    // Export Token fuer DI in anderen Modulen
    INVITE_CODE_REPOSITORY,
  ],
})
export class InviteCodeInfrastructureModule {}
