import { Inject, Injectable } from '@nestjs/common';
import { Prisma } from '@/generated/prisma/client';
import { Result } from '@domain/common/result';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPushSubscriptionRepository } from '@domain/push-notifications/i-push-subscription.repository';
import { PushSubscription } from '@domain/push-notifications/push-subscription.entity';
import { LOGGER } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * Maximale Anzahl aktiver Subscriptions pro User. Zusätzliche Registrierungen
 * verdrängen die älteste Subscription (LRU). Schützt vor Table-Bloat bei
 * Clients, die wiederholt mit neuen Endpoints registrieren, ohne dass 410-
 * Cleanups durchlaufen.
 */
export const PUSH_SUBSCRIPTION_USER_CAP = 10;

/**
 * Safety-Obergrenze für Fan-Out-Sends. Deckt Fälle ab, in denen eine
 * Netzwerk-Partitionierung 410-Cleanups temporär verhindert und sich tote
 * Endpoints angesammelt haben.
 */
export const PUSH_SUBSCRIPTION_FANOUT_LIMIT = 20;

const UNIQUE_CONSTRAINT_ERROR = 'P2002';
const RECORD_NOT_FOUND_ERROR = 'P2025';
const UPSERT_MAX_ATTEMPTS = 3;

/**
 * Prisma-Adapter für {@link IPushSubscriptionRepository}.
 *
 * Upsert-Semantik über `endpoint` UNIQUE: doppelte Registrierungen desselben
 * Endpoints rotieren nur die VAPID-Keys, `id`/`createdAt` bleiben erhalten.
 * Damit ist AC1 (Idempotenz) erfüllt. Zusätzlich enforced der Adapter einen
 * Per-User-Cap und blockt Endpoint-Hijacking (User B darf einen Endpoint, der
 * User A gehört, nicht per Upsert übernehmen).
 */
@Injectable()
export class PrismaPushSubscriptionRepository implements IPushSubscriptionRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  async upsertByEndpoint(subscription: PushSubscription): Promise<Result<PushSubscription>> {
    try {
      const existing = await this.prisma.pushSubscription.findUnique({
        where: { endpoint: subscription.endpoint },
        select: { userId: true },
      });

      if (existing && existing.userId !== subscription.userId) {
        this.logger.warn('Push-Subscription-Endpoint gehört bereits einem anderen User', {
          userId: subscription.userId,
          endpointHost: subscription.getEndpointHost(),
        });
        return Result.fail('PushSubscription endpoint belongs to a different user');
      }

      const record = await this.upsertWithRetry(subscription);

      await this.enforceUserCap(record.userId, record.id);

      return Result.ok(
        PushSubscription.reconstruct({
          id: record.id,
          userId: record.userId,
          endpoint: record.endpoint,
          p256dh: record.p256dh,
          auth: record.auth,
          createdAt: record.createdAt,
          updatedAt: record.updatedAt,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PushSubscription upsert fehlgeschlagen', {
        userId: subscription.userId,
        endpointHost: subscription.getEndpointHost(),
        error: message,
      });
      return Result.fail(`PushSubscription upsert failed: ${message}`);
    }
  }

  async findByUserId(userId: string): Promise<Result<PushSubscription[]>> {
    try {
      const rows = await this.prisma.pushSubscription.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: PUSH_SUBSCRIPTION_FANOUT_LIMIT,
      });
      return Result.ok(
        rows.map((row) =>
          PushSubscription.reconstruct({
            id: row.id,
            userId: row.userId,
            endpoint: row.endpoint,
            p256dh: row.p256dh,
            auth: row.auth,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
          }),
        ),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PushSubscription findByUserId fehlgeschlagen', { userId, error: message });
      return Result.fail(`PushSubscription lookup failed: ${message}`);
    }
  }

  async findByEndpoint(endpoint: string): Promise<Result<PushSubscription | null>> {
    try {
      const row = await this.prisma.pushSubscription.findUnique({ where: { endpoint } });
      if (!row) return Result.ok(null);
      return Result.ok(
        PushSubscription.reconstruct({
          id: row.id,
          userId: row.userId,
          endpoint: row.endpoint,
          p256dh: row.p256dh,
          auth: row.auth,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PushSubscription findByEndpoint fehlgeschlagen', { error: message });
      return Result.fail(`PushSubscription lookup failed: ${message}`);
    }
  }

  async deleteById(id: string): Promise<Result<void>> {
    try {
      await this.prisma.pushSubscription.delete({ where: { id } });
      return Result.ok(undefined);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === RECORD_NOT_FOUND_ERROR) {
        return Result.ok(undefined);
      }
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PushSubscription delete fehlgeschlagen', { id, error: message });
      return Result.fail(`PushSubscription delete failed: ${message}`);
    }
  }

  private async upsertWithRetry(subscription: PushSubscription) {
    let lastError: unknown;
    for (let attempt = 1; attempt <= UPSERT_MAX_ATTEMPTS; attempt++) {
      try {
        return await this.prisma.pushSubscription.upsert({
          where: { endpoint: subscription.endpoint },
          create: {
            userId: subscription.userId,
            endpoint: subscription.endpoint,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
          update: {
            userId: subscription.userId,
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        });
      } catch (error) {
        lastError = error;
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_ERROR && attempt < UPSERT_MAX_ATTEMPTS) {
          continue;
        }
        throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error('PushSubscription upsert exhausted retries');
  }

  private async enforceUserCap(userId: string, keepId: string): Promise<void> {
    try {
      const count = await this.prisma.pushSubscription.count({ where: { userId } });
      if (count <= PUSH_SUBSCRIPTION_USER_CAP) return;

      const evictCount = count - PUSH_SUBSCRIPTION_USER_CAP;
      const toEvict = await this.prisma.pushSubscription.findMany({
        where: { userId, NOT: { id: keepId } },
        orderBy: { createdAt: 'asc' },
        take: evictCount,
        select: { id: true },
      });

      if (toEvict.length === 0) return;

      const result = await this.prisma.pushSubscription.deleteMany({
        where: { id: { in: toEvict.map((row) => row.id) } },
      });

      this.logger.log('Push-Subscription-Cap überschritten, älteste Subscriptions entfernt', {
        userId,
        removed: result.count,
        cap: PUSH_SUBSCRIPTION_USER_CAP,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('PushSubscription-Cap-Durchsetzung fehlgeschlagen', { userId, error: message });
    }
  }
}
