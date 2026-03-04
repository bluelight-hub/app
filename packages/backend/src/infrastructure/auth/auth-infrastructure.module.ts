import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { JWT_AUTH_SERVICE, LOGGER } from '../di-tokens';
import { JwtTokenServiceAdapter } from './adapters/jwt-token-service.adapter';
import { NestLoggerAdapter } from '../common/adapters/nest-logger.adapter';
import { InfrastructureCommonModule } from '../common.module';

/**
 * NestJS Module für Auth Infrastructure Layer.
 *
 * Dieses Modul registriert die Infrastructure-Implementierungen
 * der Authentication Service Ports (Hexagonal Architecture Pattern).
 *
 * **Dependency Injection Strategy:**
 * - IJwtAuthServicePort wird als Symbol Token bereitgestellt
 * - JwtTokenServiceAdapter ist die konkrete Service-Implementierung
 * - Application Layer kann das Interface injizieren via @Inject(JWT_AUTH_SERVICE)
 *
 * **Warum Symbol Token:**
 * - Type Safety: Symbol ist type-safe und unique
 * - Application Layer kennt NUR das Interface (IJwtAuthServicePort)
 * - Application Layer kann NICHT auf Infrastructure Class referenzieren
 * - Symbol Token entkoppelt Application von Infrastructure
 * - Ermöglicht austauschbare Implementierungen (JWT, OAuth, Mock für Tests)
 *
 * **Module Dependencies:**
 * - JwtModule: NestJS JWT Service für Token-Operationen
 *
 * **JWT Configuration:**
 * - Secrets/Laufzeiten werden pro Operation im Adapter über AppConfigService aufgelöst
 * - Kein Eager-Read beim Modul-Bootstrap
 *
 * **Module Scope:**
 * - JwtModule ist lokal registriert; konkrete Signatur-Optionen kommen zur Laufzeit
 *
 * @example
 * ```typescript
 * // In Application Layer Login Handler:
 * @Injectable()
 * export class LoginCommandHandler {
 *   constructor(
 *     @Inject(JWT_AUTH_SERVICE)
 *     private readonly jwtService: IJwtAuthServicePort
 *   ) {}
 * }
 * ```
 */
@Module({
  imports: [InfrastructureCommonModule, JwtModule.register({})],
  providers: [
    // Logger für Auth Infrastructure
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('AuthInfrastructure'),
    },
    JwtTokenServiceAdapter,
    {
      provide: JWT_AUTH_SERVICE,
      useExisting: JwtTokenServiceAdapter,
    },
  ],
  exports: [JWT_AUTH_SERVICE, JwtTokenServiceAdapter, JwtModule],
})
export class AuthInfrastructureModule {}
