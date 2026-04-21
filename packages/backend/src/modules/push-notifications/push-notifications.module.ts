import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { PushNotificationsModule as PushNotificationsInfrastructureModule } from '@infrastructure/push-notifications/push-notifications.module';
import { PushSubscriptionController } from './push-subscription.controller';

/**
 * HTTP-Modul für Plattform-Push-Notifications (Story 1.1).
 *
 * Verdrahtet den {@link PushSubscriptionController} mit den Repository- und
 * Service-Providern aus der Infrastructure-Schicht
 * ({@link PushNotificationsInfrastructureModule}). Auth-Abhängigkeiten
 * (JwtAuthGuard, CurrentUser) kommen aus dem {@link AuthModule}.
 */
@Module({
  imports: [AuthModule, PushNotificationsInfrastructureModule],
  controllers: [PushSubscriptionController],
})
export class PushNotificationsModule {}
