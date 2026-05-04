/**
 * Barrel-Export der Push-Notification-Domain-Verträge.
 *
 * Application- und Infrastructure-Layer importieren ausschließlich aus diesem
 * Barrel; konkrete Adapter (`PushNotificationsService`,
 * `PrismaPushSubscriptionRepository`) leben in der Infrastructure-Schicht.
 */
export type { IPushNotificationService } from './i-push-notification.service';
export type { IPushSubscriptionRepository } from './i-push-subscription.repository';
export type { PushPayload } from './push-payload';
export { PushSubscription } from './push-subscription.entity';
