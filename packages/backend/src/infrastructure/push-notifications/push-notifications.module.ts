import { Inject, Module, type OnModuleInit } from '@nestjs/common';
import webpush from 'web-push';
import type { IRuntimeConfigPort } from '@domain/ports/i-runtime-config.port';
import { InfrastructureCommonModule } from '@infrastructure/common.module';
import { PrismaModule } from '@infrastructure/database/prisma.module';
import { PUSH_SUBSCRIPTION_REPOSITORY, RUNTIME_CONFIG } from '@infrastructure/di-tokens';
import { PrismaPushSubscriptionRepository } from './prisma-push-subscription.repository';
import { PushNotificationsService } from './push-notifications.service';

const VAPID_PUBLIC_KEY = 'VAPID_PUBLIC_KEY';
const VAPID_PRIVATE_KEY = 'VAPID_PRIVATE_KEY';
const VAPID_SUBJECT = 'VAPID_SUBJECT';
const VAPID_SUBJECT_SCHEME = /^(mailto:|https:)/;
const VAPID_MISSING_HINT = 'VAPID keypair missing — set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY und VAPID_SUBJECT in der Secret-Umgebung (z. B. via @dotenvx/dotenvx).';

/**
 * Infrastructure-Modul für Plattform-Push-Notifications (Story 1.1, ADR-011).
 *
 * Konfiguriert VAPID-Keypair beim Boot über {@link IRuntimeConfigPort} und
 * bricht den Start ab, wenn Public- oder Private-Key fehlen (AC3, Fail-Fast).
 * Die konkreten Werte werden nie geloggt; lediglich die betroffenen Env-Keys
 * werden als DX-Hinweis zurückgegeben.
 *
 * Der `LOGGER`-Provider wird bewusst NICHT lokal überschrieben — das globale
 * {@link InfrastructureCommonModule} stellt ihn `@Global()` bereit und
 * vermeidet Provider-Shadowing.
 *
 * Exportiert {@link PushNotificationsService} und das
 * {@link PUSH_SUBSCRIPTION_REPOSITORY}-Token für Consumer aus anderen Modulen.
 */
@Module({
  imports: [InfrastructureCommonModule, PrismaModule],
  providers: [
    PrismaPushSubscriptionRepository,
    {
      provide: PUSH_SUBSCRIPTION_REPOSITORY,
      useExisting: PrismaPushSubscriptionRepository,
    },
    PushNotificationsService,
  ],
  exports: [PushNotificationsService, PUSH_SUBSCRIPTION_REPOSITORY],
})
export class PushNotificationsModule implements OnModuleInit {
  constructor(@Inject(RUNTIME_CONFIG) private readonly runtimeConfig: IRuntimeConfigPort) {}

  onModuleInit(): void {
    const publicKey = this.runtimeConfig.getString(VAPID_PUBLIC_KEY).trim();
    const privateKey = this.runtimeConfig.getString(VAPID_PRIVATE_KEY).trim();

    if (!publicKey || !privateKey) {
      throw new Error(VAPID_MISSING_HINT);
    }

    const subject = this.runtimeConfig.getString(VAPID_SUBJECT).trim();
    if (!subject) {
      throw new Error(`VAPID_SUBJECT fehlt — setze ${VAPID_SUBJECT} auf eine mailto:- oder https:-URL.`);
    }
    if (!VAPID_SUBJECT_SCHEME.test(subject)) {
      throw new Error(`VAPID_SUBJECT hat ungültiges Schema — setze ${VAPID_SUBJECT} auf eine mailto:- oder https:-URL.`);
    }

    try {
      webpush.setVapidDetails(subject, publicKey, privateKey);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`VAPID keypair abgelehnt von web-push — prüfe ${VAPID_PUBLIC_KEY} und ${VAPID_PRIVATE_KEY} (Grund: ${reason}).`);
    }
  }
}
