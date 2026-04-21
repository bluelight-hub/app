import type { Result } from '@domain/common/result';
import type { PushSubscription } from './push-subscription.entity';

/**
 * Repository-Port für die Persistenz von {@link PushSubscription}-Entities.
 *
 * Adapter-Implementierung liegt in der Infrastructure-Schicht
 * (`prisma-push-subscription.repository.ts`).
 */
export interface IPushSubscriptionRepository {
  /**
   * Legt eine Subscription an oder ersetzt sie, wenn für den `endpoint`
   * bereits ein Datensatz existiert (Idempotenz-Garantie für AC1 — doppelter
   * Client-Registrierungs-Call liefert HTTP 201 ohne Fehler).
   *
   * Implementierungshinweis: Prisma `upsert` auf dem UNIQUE-Feld `endpoint`,
   * Rotation der Keys (`p256dh`, `auth`) bei Existenz.
   */
  upsertByEndpoint(subscription: PushSubscription): Promise<Result<PushSubscription>>;

  /**
   * Liefert alle Subscriptions eines Users (Geräte-Fanout beim Versand).
   */
  findByUserId(userId: string): Promise<Result<PushSubscription[]>>;

  /**
   * Liefert die Subscription zu einem Endpoint oder `null`.
   */
  findByEndpoint(endpoint: string): Promise<Result<PushSubscription | null>>;

  /**
   * Löscht eine Subscription anhand ihrer ID. Wird nach 410/404 vom Push-
   * Service aufgerufen (AC2).
   */
  deleteById(id: string): Promise<Result<void>>;
}
