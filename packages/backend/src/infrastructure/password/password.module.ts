import { Module, Global } from '@nestjs/common';
import { HibpService } from './hibp.service';
import { PasswordValidationService } from './password-validation.service';
import { LOGGER } from '@/infrastructure/di-tokens';
import { NestLoggerAdapter } from '@/infrastructure/common/adapters/nest-logger.adapter';

/**
 * Password Infrastructure Module
 *
 * Stellt Services für Passwort-Sicherheitsprüfungen bereit:
 * - HibpService: Have I Been Pwned Datenleck-Prüfung (K-Anonymity)
 * - PasswordValidationService: Zentraler NIST-konformer Passwort-Validator
 *
 * **NIST SP 800-63B-4 Compliance:**
 * - Breach Database Check (HIBP mit K-Anonymity)
 * - Blocklist-Prüfung (~193 häufige Passwörter)
 * - KEINE Composition Rules
 */
@Global()
@Module({
  providers: [
    {
      provide: LOGGER,
      useFactory: () => new NestLoggerAdapter('PasswordModule'),
    },
    HibpService,
    PasswordValidationService,
  ],
  exports: [HibpService, PasswordValidationService],
})
export class PasswordModule {}
