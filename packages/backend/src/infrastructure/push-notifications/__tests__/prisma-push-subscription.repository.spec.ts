import { Prisma } from '@/generated/prisma/client';
import { PushSubscription } from '@domain/push-notifications/push-subscription.entity';
import { PUSH_SUBSCRIPTION_USER_CAP, PrismaPushSubscriptionRepository } from '../prisma-push-subscription.repository';

const PRISMA_CLIENT_VERSION = 'test';

const makePrismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError(`Prisma error ${code}`, {
    code,
    clientVersion: PRISMA_CLIENT_VERSION,
  });

describe('PrismaPushSubscriptionRepository', () => {
  const now = new Date('2026-04-21T10:00:00Z');

  const buildPrismaStub = () => ({
    pushSubscription: {
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
      delete: jest.fn(),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      count: jest.fn().mockResolvedValue(0),
    },
  });

  const logger = () => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  });

  const buildEntity = () => {
    const result = PushSubscription.create({
      userId: 'user-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'p256',
      auth: 'auth',
    });
    if (!result.value) throw new Error('Fixture failed');
    return result.value;
  };

  it('(a) upsertByEndpoint returns the persisted entity and rotates keys idempotently', async () => {
    const prisma = buildPrismaStub();
    const record = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'p256',
      auth: 'auth',
      createdAt: now,
      updatedAt: now,
    };
    prisma.pushSubscription.upsert.mockResolvedValue(record);

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.upsertByEndpoint(buildEntity());

    expect(result.isSuccess).toBe(true);
    expect(result.value?.id).toBe('sub-1');

    const call = prisma.pushSubscription.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ endpoint: 'https://fcm.googleapis.com/fcm/send/abc' });
    expect(call.create).toMatchObject({ userId: 'user-1', p256dh: 'p256', auth: 'auth' });
    expect(call.update).toEqual({ userId: 'user-1', p256dh: 'p256', auth: 'auth' });
  });

  it('rejects an upsert when the endpoint already belongs to a different user (hijack protection)', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.findUnique.mockResolvedValue({ userId: 'attacker' });
    const log = logger();

    const repo = new PrismaPushSubscriptionRepository(prisma as never, log);
    const result = await repo.upsertByEndpoint(buildEntity());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('different user');
    expect(prisma.pushSubscription.upsert).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalledWith(expect.stringContaining('bereits einem anderen User'), expect.objectContaining({ userId: 'user-1' }));
  });

  it('retries the upsert on a P2002 race (unique constraint)', async () => {
    const prisma = buildPrismaStub();
    const record = {
      id: 'sub-1',
      userId: 'user-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'p256',
      auth: 'auth',
      createdAt: now,
      updatedAt: now,
    };
    prisma.pushSubscription.upsert.mockRejectedValueOnce(makePrismaError('P2002')).mockResolvedValueOnce(record);

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.upsertByEndpoint(buildEntity());

    expect(result.isSuccess).toBe(true);
    expect(prisma.pushSubscription.upsert).toHaveBeenCalledTimes(2);
  });

  it('evicts the oldest subscriptions when the per-user cap is exceeded', async () => {
    const prisma = buildPrismaStub();
    const record = {
      id: 'sub-new',
      userId: 'user-1',
      endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
      p256dh: 'p256',
      auth: 'auth',
      createdAt: now,
      updatedAt: now,
    };
    prisma.pushSubscription.upsert.mockResolvedValue(record);
    prisma.pushSubscription.count.mockResolvedValue(PUSH_SUBSCRIPTION_USER_CAP + 2);
    prisma.pushSubscription.findMany.mockResolvedValueOnce([{ id: 'old-1' }, { id: 'old-2' }]);
    prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 2 });

    const log = logger();
    const repo = new PrismaPushSubscriptionRepository(prisma as never, log);
    const result = await repo.upsertByEndpoint(buildEntity());

    expect(result.isSuccess).toBe(true);
    expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1', NOT: { id: 'sub-new' } },
        orderBy: { createdAt: 'asc' },
        take: 2,
      }),
    );
    expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({ where: { id: { in: ['old-1', 'old-2'] } } });
    expect(log.log).toHaveBeenCalledWith(expect.stringContaining('Cap überschritten'), expect.objectContaining({ userId: 'user-1', removed: 2 }));
  });

  it('wraps Prisma errors in Result.fail without leaking secrets into logs', async () => {
    const prisma = buildPrismaStub();
    const log = logger();
    prisma.pushSubscription.upsert.mockRejectedValue(new Error('db down'));

    const repo = new PrismaPushSubscriptionRepository(prisma as never, log);
    const result = await repo.upsertByEndpoint(buildEntity());

    expect(result.isFailure).toBe(true);
    const logged = JSON.stringify(log.error.mock.calls);
    expect(logged).not.toContain('"p256"');
    expect(logged).not.toContain('"auth"');
    expect(logged).toContain('fcm.googleapis.com');
  });

  it('findByUserId maps rows to reconstructed entities (capped fan-out)', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.findMany.mockResolvedValue([
      { id: 'a', userId: 'u', endpoint: 'https://x.example/a', p256dh: 'p', auth: 'a', createdAt: now, updatedAt: now },
      { id: 'b', userId: 'u', endpoint: 'https://x.example/b', p256dh: 'p', auth: 'a', createdAt: now, updatedAt: now },
    ]);

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.findByUserId('u');

    expect(result.isSuccess).toBe(true);
    expect(result.value?.map((s) => s.id)).toEqual(['a', 'b']);
    const call = prisma.pushSubscription.findMany.mock.calls[0][0];
    expect(call.take).toBeGreaterThan(0);
    expect(call.orderBy).toEqual({ createdAt: 'desc' });
  });

  it('deleteById returns ok on success', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.delete.mockResolvedValue({ id: 'x' });

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.deleteById('x');

    expect(result.isSuccess).toBe(true);
    expect(prisma.pushSubscription.delete).toHaveBeenCalledWith({ where: { id: 'x' } });
  });

  it('deleteById silently returns ok on P2025 (record-not-found)', async () => {
    const prisma = buildPrismaStub();
    const log = logger();
    prisma.pushSubscription.delete.mockRejectedValue(makePrismaError('P2025'));

    const repo = new PrismaPushSubscriptionRepository(prisma as never, log);
    const result = await repo.deleteById('missing');

    expect(result.isSuccess).toBe(true);
    expect(log.error).not.toHaveBeenCalled();
  });

  it('deleteById returns Result.fail on other prisma errors', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.delete.mockRejectedValue(new Error('fk violation'));

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.deleteById('x');

    expect(result.isFailure).toBe(true);
  });

  it('findByUserId surfaces prisma errors as Result.fail', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.findMany.mockRejectedValue(new Error('db unreachable'));

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.findByUserId('user-1');

    expect(result.isFailure).toBe(true);
  });

  it('findByEndpoint returns null when no row matches', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.findUnique.mockResolvedValue(null);

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.findByEndpoint('https://example.com/push');

    expect(result.isSuccess).toBe(true);
    expect(result.value).toBeNull();
  });

  it('findByEndpoint maps a matching row to a reconstructed entity', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.findUnique.mockResolvedValue({
      id: 'sub-a',
      userId: 'u',
      endpoint: 'https://x.example/a',
      p256dh: 'p',
      auth: 'a',
      createdAt: now,
      updatedAt: now,
    });

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.findByEndpoint('https://x.example/a');

    expect(result.isSuccess).toBe(true);
    expect(result.value?.id).toBe('sub-a');
  });

  it('findByEndpoint surfaces prisma errors as Result.fail', async () => {
    const prisma = buildPrismaStub();
    prisma.pushSubscription.findUnique.mockRejectedValue(new Error('oops'));

    const repo = new PrismaPushSubscriptionRepository(prisma as never, logger());
    const result = await repo.findByEndpoint('https://x.example/a');

    expect(result.isFailure).toBe(true);
  });
});
