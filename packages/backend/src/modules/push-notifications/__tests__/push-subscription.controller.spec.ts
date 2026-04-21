import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { IPushSubscriptionRepository } from '@domain/push-notifications/i-push-subscription.repository';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { PushSubscriptionController } from '../push-subscription.controller';
import type { CreatePushSubscriptionDto } from '../dtos/create-push-subscription.dto';

describe('PushSubscriptionController', () => {
  const now = new Date('2026-04-21T10:00:00Z');
  const currentUser: ValidatedUser = { userId: 'user-1' };
  const validDto: CreatePushSubscriptionDto = {
    endpoint: 'https://fcm.googleapis.com/fcm/send/opaque-TOKEN-xyz',
    keys: { p256dh: 'SECRET-P256', auth: 'SECRET-AUTH' },
  };

  const repoFactory = (): jest.Mocked<IPushSubscriptionRepository> => ({
    upsertByEndpoint: jest.fn(),
    findByUserId: jest.fn(),
    findByEndpoint: jest.fn(),
    deleteById: jest.fn(),
  });

  const loggerFactory = () => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  it('creates the subscription and returns the wrapped DTO', async () => {
    const repo = repoFactory();
    const logger = loggerFactory();
    const controller = new PushSubscriptionController(repo, logger);

    repo.upsertByEndpoint.mockImplementation(async (sub) =>
      Result.ok(
        (await import('@domain/push-notifications/push-subscription.entity')).PushSubscription.reconstruct({
          id: 'sub-1',
          userId: sub.userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
          createdAt: now,
          updatedAt: now,
        }),
      ),
    );

    const response = await controller.register(currentUser, validDto);

    expect(response.id).toBe('sub-1');
    expect(response.userId).toBe('user-1');
    expect(response.endpoint).toBe(validDto.endpoint);
    expect(response).not.toHaveProperty('p256dh');
    expect(response).not.toHaveProperty('auth');

    // AC4: log contains only userId + endpointHost + timestamps
    const loggedArgs = JSON.stringify(logger.log.mock.calls);
    expect(loggedArgs).toContain('fcm.googleapis.com');
    expect(loggedArgs).not.toContain('SECRET-P256');
    expect(loggedArgs).not.toContain('SECRET-AUTH');
    expect(loggedArgs).not.toContain('opaque-TOKEN-xyz');
  });

  it('rejects DTOs that fail domain validation with BadRequestException', async () => {
    const repo = repoFactory();
    const controller = new PushSubscriptionController(repo, loggerFactory());

    await expect(
      controller.register(currentUser, {
        ...validDto,
        endpoint: 'http://insecure.example.com/push',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repo.upsertByEndpoint).not.toHaveBeenCalled();
  });

  it('translates repository failures into 500 responses', async () => {
    const repo = repoFactory();
    repo.upsertByEndpoint.mockResolvedValue(Result.fail('db exploded'));
    const controller = new PushSubscriptionController(repo, loggerFactory());

    await expect(controller.register(currentUser, validDto)).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('returns 400 when the endpoint belongs to a different user (hijack rejection)', async () => {
    const repo = repoFactory();
    repo.upsertByEndpoint.mockResolvedValue(Result.fail('PushSubscription endpoint belongs to a different user'));
    const controller = new PushSubscriptionController(repo, loggerFactory());

    await expect(controller.register(currentUser, validDto)).rejects.toBeInstanceOf(BadRequestException);
  });
});
