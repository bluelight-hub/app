import { Result } from '@domain/common/result';
import type { IPushSubscriptionRepository } from '@domain/push-notifications/i-push-subscription.repository';
import type { PushPayload } from '@domain/push-notifications/push-payload';
import { PushSubscription } from '@domain/push-notifications/push-subscription.entity';
import { PushNotificationsService } from '../push-notifications.service';

jest.mock('web-push', () => ({
  __esModule: true,
  default: {
    sendNotification: jest.fn(),
    setVapidDetails: jest.fn(),
  },
  setVapidDetails: jest.fn(),
  sendNotification: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpushMock = require('web-push').default as {
  sendNotification: jest.Mock;
  setVapidDetails: jest.Mock;
};

const fixtureSubscription = () =>
  PushSubscription.reconstruct({
    id: 'sub-1',
    userId: 'user-1',
    endpoint: 'https://fcm.googleapis.com/fcm/send/opaque-TOKEN-xyz',
    p256dh: 'VERY-SECRET-P256DH-KEY',
    auth: 'VERY-SECRET-AUTH-VALUE',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  });

const basePayload: PushPayload = {
  eventId: 'evt-42',
  title: 'Kritischer Hinweis',
  body: 'Bitte quittieren',
};

describe('PushNotificationsService', () => {
  let repo: jest.Mocked<IPushSubscriptionRepository>;
  let logger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };
  let service: PushNotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();

    repo = {
      upsertByEndpoint: jest.fn(),
      findByUserId: jest.fn(),
      findByEndpoint: jest.fn(),
      deleteById: jest.fn(),
    };

    logger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    service = new PushNotificationsService(repo, logger);
  });

  it('(c) sends via web-push with subscription + serialized payload and explicit timeout', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 });

    await service.send('user-1', basePayload);

    expect(webpushMock.sendNotification).toHaveBeenCalledTimes(1);
    const [subArg, payloadArg, optionsArg] = webpushMock.sendNotification.mock.calls[0];
    expect(subArg).toEqual({
      endpoint: subscription.endpoint,
      keys: { p256dh: subscription.p256dh, auth: subscription.auth },
    });
    expect(JSON.parse(payloadArg)).toEqual(basePayload);
    expect(optionsArg).toEqual(expect.objectContaining({ timeout: expect.any(Number) }));
    expect(repo.deleteById).not.toHaveBeenCalled();
  });

  it('(d) deletes the subscription on HTTP 410 Gone', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    repo.deleteById.mockResolvedValue(Result.ok(undefined));
    webpushMock.sendNotification.mockRejectedValue(Object.assign(new Error('Gone'), { statusCode: 410 }));

    await service.send('user-1', basePayload);

    expect(repo.deleteById).toHaveBeenCalledWith('sub-1');
    expect(logger.warn).toHaveBeenCalledWith('Push-Subscription wird aufgeräumt', expect.objectContaining({ statusCode: 410, subscriptionId: 'sub-1', reason: 'gone' }));
  });

  it('(d) deletes the subscription on HTTP 404 Not Found', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    repo.deleteById.mockResolvedValue(Result.ok(undefined));
    webpushMock.sendNotification.mockRejectedValue(Object.assign(new Error('Not Found'), { statusCode: 404 }));

    await service.send('user-1', basePayload);

    expect(repo.deleteById).toHaveBeenCalledWith('sub-1');
  });

  it('(e) keeps the subscription on transient errors (Timeout / 5xx)', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    webpushMock.sendNotification.mockRejectedValue(Object.assign(new Error('Timeout'), { statusCode: 504 }));

    await service.send('user-1', basePayload);

    expect(repo.deleteById).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Push-Notification-Versand fehlgeschlagen', expect.objectContaining({ statusCode: 504 }));
  });

  it('deletes the subscription when web-push reports an invalid key (poison cleanup)', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    repo.deleteById.mockResolvedValue(Result.ok(undefined));
    webpushMock.sendNotification.mockRejectedValue(new Error('Invalid key for subscription'));

    await service.send('user-1', basePayload);

    expect(repo.deleteById).toHaveBeenCalledWith('sub-1');
    expect(logger.warn).toHaveBeenCalledWith('Push-Subscription wird aufgeräumt', expect.objectContaining({ reason: 'invalid-key' }));
  });

  it('aborts the send when the payload exceeds the VAPID 4000-byte limit', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    const oversizedPayload: PushPayload = {
      ...basePayload,
      body: 'x'.repeat(5000),
    };

    await service.send('user-1', oversizedPayload);

    expect(webpushMock.sendNotification).not.toHaveBeenCalled();
    expect(repo.findByUserId).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(
      'Push-Payload überschreitet die erlaubte Größe und wird nicht versendet',
      expect.objectContaining({ payloadBytes: expect.any(Number), maxBytes: expect.any(Number) }),
    );
  });

  it('aborts the send when the payload cannot be serialized', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const unserializable: PushPayload = {
      ...basePayload,
      data: cyclic,
    };

    await service.send('user-1', unserializable);

    expect(webpushMock.sendNotification).not.toHaveBeenCalled();
    expect(repo.findByUserId).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Push-Payload konnte nicht serialisiert werden', expect.objectContaining({ userId: 'user-1', eventId: basePayload.eventId }));
  });

  it('(f) log payload structure matches the AC4 whitelist (snapshot-like)', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 });

    await service.send('user-1', basePayload);

    expect(logger.log).toHaveBeenCalledWith('Push-Notification versendet', {
      userId: 'user-1',
      subscriptionId: 'sub-1',
      endpointHost: 'fcm.googleapis.com',
      eventId: basePayload.eventId,
    });
  });

  it('(f) never logs VAPID keys, auth secret or full endpoint token', async () => {
    const subscription = fixtureSubscription();
    repo.findByUserId.mockResolvedValue(Result.ok([subscription]));
    webpushMock.sendNotification.mockResolvedValue({ statusCode: 201 });

    await service.send('user-1', basePayload);

    const allLoggedValues: unknown[] = [...logger.log.mock.calls.flat(), ...logger.error.mock.calls.flat(), ...logger.warn.mock.calls.flat(), ...logger.debug.mock.calls.flat()];
    const serialized = JSON.stringify(allLoggedValues);
    expect(serialized).not.toContain(subscription.p256dh);
    expect(serialized).not.toContain(subscription.auth);
    expect(serialized).not.toContain(subscription.endpoint);
    expect(serialized).not.toContain('opaque-TOKEN-xyz');
    expect(serialized).toContain('fcm.googleapis.com');
  });

  it('short-circuits and does not call web-push when the user has no subscriptions', async () => {
    repo.findByUserId.mockResolvedValue(Result.ok([]));

    await service.send('user-1', basePayload);

    expect(webpushMock.sendNotification).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });

  it('logs and returns early when the repository lookup fails', async () => {
    repo.findByUserId.mockResolvedValue(Result.fail('DB boom'));

    await service.send('user-1', basePayload);

    expect(webpushMock.sendNotification).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('Push-Notification konnte Subscriptions nicht laden', expect.objectContaining({ userId: 'user-1', error: 'DB boom' }));
  });
});
