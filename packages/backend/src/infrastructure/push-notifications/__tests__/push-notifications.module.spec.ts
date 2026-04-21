import { Test } from '@nestjs/testing';
import type { IRuntimeConfigPort } from '@domain/ports/i-runtime-config.port';
import { LOGGER, PUSH_SUBSCRIPTION_REPOSITORY, RUNTIME_CONFIG } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { PushNotificationsModule } from '../push-notifications.module';

jest.mock('web-push', () => {
  const setVapidDetails = jest.fn();
  return {
    __esModule: true,
    default: { setVapidDetails, sendNotification: jest.fn() },
    setVapidDetails,
    sendNotification: jest.fn(),
  };
});

// eslint-disable-next-line @typescript-eslint/no-require-imports
const webpushMock = require('web-push').default as { setVapidDetails: jest.Mock };

const buildModule = async (config: Partial<Record<string, string>>) => {
  const runtimeConfig: IRuntimeConfigPort = {
    getString: (key: string, fallback = '') => config[key] ?? fallback,
  };

  return Test.createTestingModule({
    imports: [PushNotificationsModule],
  })
    .overrideProvider(RUNTIME_CONFIG)
    .useValue(runtimeConfig)
    .overrideProvider(PrismaService)
    .useValue({})
    .overrideProvider(LOGGER)
    .useValue({
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    })
    .overrideProvider(PUSH_SUBSCRIPTION_REPOSITORY)
    .useValue({
      upsertByEndpoint: jest.fn(),
      findByUserId: jest.fn(),
      findByEndpoint: jest.fn(),
      deleteById: jest.fn(),
    })
    .compile();
};

describe('PushNotificationsModule Fail-Fast', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('boots cleanly with full VAPID configuration and forwards keys to web-push.setVapidDetails', async () => {
    const app = await buildModule({
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'mailto:ops@example.org',
    });

    await app.init();

    expect(webpushMock.setVapidDetails).toHaveBeenCalledWith('mailto:ops@example.org', 'public-key', 'private-key');

    await app.close();
  });

  it('accepts VAPID_SUBJECT with https: scheme', async () => {
    const app = await buildModule({
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'https://ops.example.org',
    });

    await app.init();

    expect(webpushMock.setVapidDetails).toHaveBeenCalledWith('https://ops.example.org', 'public-key', 'private-key');

    await app.close();
  });

  it('fails fast when VAPID_PUBLIC_KEY is missing', async () => {
    const app = await buildModule({
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'mailto:ops@example.org',
    });

    await expect(app.init()).rejects.toThrow(/VAPID keypair missing/);

    try {
      await app.close();
    } catch {
      /* init failed — nothing to tear down */
    }
  });

  it('fails fast when VAPID_PRIVATE_KEY is missing', async () => {
    const app = await buildModule({
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_SUBJECT: 'mailto:ops@example.org',
    });

    await expect(app.init()).rejects.toThrow(/VAPID keypair missing/);

    try {
      await app.close();
    } catch {
      /* init failed — nothing to tear down */
    }
  });

  it('fails fast when VAPID_SUBJECT is missing', async () => {
    const app = await buildModule({
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
    });

    await expect(app.init()).rejects.toThrow(/VAPID_SUBJECT fehlt/);

    try {
      await app.close();
    } catch {
      /* init failed — nothing to tear down */
    }
  });

  it('fails fast when VAPID_SUBJECT has an unsupported scheme', async () => {
    const app = await buildModule({
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'bluelight.example',
    });

    await expect(app.init()).rejects.toThrow(/ungültiges Schema/);

    try {
      await app.close();
    } catch {
      /* init failed — nothing to tear down */
    }
  });

  it('wraps web-push.setVapidDetails errors with a DX hint (no stack-trace leak)', async () => {
    webpushMock.setVapidDetails.mockImplementationOnce(() => {
      throw new Error('invalid keypair');
    });
    const app = await buildModule({
      VAPID_PUBLIC_KEY: 'public-key',
      VAPID_PRIVATE_KEY: 'private-key',
      VAPID_SUBJECT: 'mailto:ops@example.org',
    });

    await expect(app.init()).rejects.toThrow(/VAPID keypair abgelehnt von web-push/);

    try {
      await app.close();
    } catch {
      /* expected */
    }
  });

  it('does not log the actual key values in the fail-fast error', async () => {
    const app = await buildModule({
      VAPID_PRIVATE_KEY: 'super-secret-private',
      VAPID_SUBJECT: 'mailto:ops@example.org',
    });

    await expect(app.init()).rejects.toThrow(/set VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY/);
    await expect(app.init()).rejects.not.toThrow(/super-secret-private/);

    try {
      await app.close();
    } catch {
      /* expected */
    }
  });
});
