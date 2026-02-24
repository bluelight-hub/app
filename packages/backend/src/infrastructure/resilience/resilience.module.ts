/**
 * Resilience Module - Infrastructure Layer.
 *
 * Stellt Circuit Breaker Service fuer externe Integrationen bereit.
 *
 * @see Story 5.3 AC1
 * @module infrastructure/resilience
 */
import { Module } from '@nestjs/common';
import { CircuitBreakerService } from './circuit-breaker.service';
import { RESILIENCE } from '@infrastructure/di-tokens';

@Module({
  providers: [
    {
      provide: RESILIENCE.CIRCUIT_BREAKER,
      useClass: CircuitBreakerService,
    },
  ],
  exports: [RESILIENCE.CIRCUIT_BREAKER],
})
export class ResilienceModule {}
