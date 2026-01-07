import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@domain/common/result';
import type { UserAggregate } from '@domain/aggregates/user.aggregate';
import { LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CompleteSetupHandler } from '../complete-setup.handler';
import { CompleteSetupCommand } from '../complete-setup.command';

// Mock bcrypt mit korrektem 60-Zeichen Hash Format
// Ein echter bcrypt Hash ist exakt 60 Zeichen lang: $2b$10$ (7) + 22 salt + 31 hash = 60
const MOCK_BCRYPT_HASH = '$2b$10$abcdefghijklmnopqrstuABCDEFGHIJKLMNOPQRSTUVWXYZ012345';
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$abcdefghijklmnopqrstuABCDEFGHIJKLMNOPQRSTUVWXYZ012345'),
}));

describe('CompleteSetupHandler', () => {
  let handler: CompleteSetupHandler;
  let mockUserRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByUsername: jest.Mock;
    countByRoles: jest.Mock;
    setPasswordHash: jest.Mock;
  };
  let mockTokenRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByHash: jest.Mock;
    findActive: jest.Mock;
  };
  let mockOutboxRepository: {
    save: jest.Mock;
    findPendingEvents: jest.Mock;
    markAsPublished: jest.Mock;
    markAsFailed: jest.Mock;
    getRetryCount: jest.Mock;
  };
  let mockPrismaService: {
    $transaction: jest.Mock;
  };
  let mockLogger: {
    log: jest.Mock;
    error: jest.Mock;
    warn: jest.Mock;
    debug: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset bcrypt mock mit korrektem 60-Zeichen Format
    (bcrypt.hash as jest.Mock).mockResolvedValue(MOCK_BCRYPT_HASH);

    mockUserRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      countByRoles: jest.fn().mockResolvedValue(Result.ok(0)), // Default: Kein Admin existiert
      setPasswordHash: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    mockTokenRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByHash: jest.fn(),
      findActive: jest.fn(),
    };

    mockOutboxRepository = {
      save: jest.fn().mockResolvedValue(undefined),
      findPendingEvents: jest.fn(),
      markAsPublished: jest.fn(),
      markAsFailed: jest.fn(),
      getRetryCount: jest.fn(),
    };

    mockPrismaService = {
      $transaction: jest.fn().mockImplementation(async (callback) => {
        // Transaction Mock - die Repositories nutzen jetzt ihre eigenen Mocks
        const txMock = {};
        return callback(txMock);
      }),
    };

    mockLogger = {
      log: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteSetupHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get<CompleteSetupHandler>(CompleteSetupHandler);
  });

  describe('execute', () => {
    it('sollte Setup erfolgreich durchfuehren mit gueltigen Daten', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value!.user).toBeDefined();
      expect(result.value!.user.username).toBe('admin');
      expect(result.value!.user.role).toBe('ADMIN');
      expect(result.value!.accessToken).toBeDefined();
      expect(result.value!.accessToken.token).toMatch(/^blh_/);
      expect(result.value!.accessToken.name).toBe('Initial Setup Token');
    });

    it('sollte countByRoles mit korrekten Rollen aufrufen', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockUserRepository.countByRoles).toHaveBeenCalledWith(['ADMIN', 'SUPER_ADMIN'], expect.anything());
    });

    it('sollte fehlschlagen wenn Admin bereits existiert (AC5)', async () => {
      // Given (Arrange)
      mockUserRepository.countByRoles.mockResolvedValue(Result.ok(1)); // Admin existiert bereits

      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SETUP_ALREADY_COMPLETED');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
    });

    it('sollte fehlschlagen wenn SUPER_ADMIN bereits existiert', async () => {
      // Given (Arrange)
      mockUserRepository.countByRoles.mockResolvedValue(Result.ok(1)); // SUPER_ADMIN counts as admin

      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SETUP_ALREADY_COMPLETED');
    });

    it('sollte Passwort mit bcrypt hashen (cost 10)', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', 10);
    });

    it('sollte Token mit bcrypt hashen (cost 10)', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      // bcrypt.hash sollte 2x aufgerufen werden: 1x Passwort, 1x Token
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
      // Zweiter Aufruf ist Token-Hashing (mit blh_ Prefix)
      expect((bcrypt.hash as jest.Mock).mock.calls[1][0]).toMatch(/^blh_/);
      expect((bcrypt.hash as jest.Mock).mock.calls[1][1]).toBe(10);
    });

    it('sollte Token im Format blh_xxx generieren (AC3)', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.accessToken.token).toMatch(/^blh_[a-z0-9]{24}$/);
    });

    it('sollte Audit-Trail loggen mit User-Kontext und maskiertem Token-Prefix (AC4, 6.9 Fix)', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('Server setup completed'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining("Admin user 'admin'"));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('ID:'));
      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('prefix: blh_'));
    });
  });

  describe('Command Validation', () => {
    it('sollte fehlschlagen mit zu kurzem Nutzernamen', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: 'ab',
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('mindestens 3 Zeichen');
    });

    it('sollte fehlschlagen mit zu langem Nutzernamen', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: 'a'.repeat(51),
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('maximal 50 Zeichen');
    });

    it('sollte fehlschlagen mit ungueltigem Nutzernamen (Sonderzeichen)', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: 'admin@test',
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('alphanumerische Zeichen');
    });

    it('sollte fehlschlagen mit zu kurzem Passwort', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: 'admin',
        password: '1234567', // Nur 7 Zeichen
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('mindestens 8 Zeichen');
    });

    it('sollte fehlschlagen ohne Nutzername', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: '',
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('Nutzername');
    });

    it('sollte fehlschlagen ohne Passwort', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: 'admin',
        password: '',
      });

      // Then (Assert)
      expect(commandResult.isFailure).toBe(true);
      expect(commandResult.error).toContain('mindestens 8 Zeichen');
    });

    it('sollte Nutzername auf Kleinschreibung normalisieren', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: 'ADMIN',
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value!.username).toBe('admin');
    });

    it('sollte Nutzername trimmen', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: '  admin  ',
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value!.username).toBe('admin');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte User und Token in gleicher Transaktion speichern', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      // Beide sollten mit Transaction Context aufgerufen werden
      expect(mockUserRepository.save.mock.calls[0][1]).toBeDefined();
      expect(mockTokenRepository.save.mock.calls[0][1]).toBeDefined();
    });

    it('sollte Rollback durchfuehren wenn UserRepository.save fehlschlaegt', async () => {
      // Given (Arrange)
      mockUserRepository.save.mockResolvedValue(Result.fail('User konnte nicht gespeichert werden'));

      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('User konnte nicht gespeichert werden');
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Rollback durchfuehren wenn TokenRepository.save fehlschlaegt', async () => {
      // Given (Arrange)
      mockTokenRepository.save.mockResolvedValue(Result.fail('Token konnte nicht gespeichert werden'));

      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Token konnte nicht gespeichert werden');
    });

    it('sollte Rollback durchfuehren wenn Outbox-Speicherung fehlschlaegt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Outbox-Speicherfehler');
    });
  });

  describe('Domain Event Emission', () => {
    it('sollte Domain Events fuer User und Token sammeln', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = mockOutboxRepository.save.mock.calls[0][0];
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('sollte UserCreatedEvent emittieren', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const events = mockOutboxRepository.save.mock.calls[0][0];
      const userEvent = events.find((e: { constructor: { name: string } }) => e.constructor.name === 'UserCreatedEvent');
      expect(userEvent).toBeDefined();
    });

    it('sollte ServerAccessTokenCreatedEvent emittieren', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const events = mockOutboxRepository.save.mock.calls[0][0];
      const tokenEvent = events.find((e: { constructor: { name: string } }) => e.constructor.name === 'ServerAccessTokenCreatedEvent');
      expect(tokenEvent).toBeDefined();
    });
  });

  describe('Security Considerations', () => {
    it('sollte Raw-Token NUR in Response zurueckgeben (nicht in IRGENDEINEM Log)', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const rawToken = result.value!.accessToken.token;

      // Pruefe ALLE Logger-Methoden auf Token-Leak (6.7 Security Fix)
      const allLogMethods = ['log', 'error', 'warn', 'debug'] as const;
      for (const method of allLogMethods) {
        const calls = mockLogger[method].mock.calls;
        for (const call of calls) {
          // Pruefe jedes Argument jedes Aufrufs
          for (const arg of call) {
            const argString = typeof arg === 'string' ? arg : JSON.stringify(arg);
            expect(argString).not.toContain(rawToken);
          }
        }
      }
    });

    it('sollte nur Token-Prefix (erste 7 Zeichen) im Audit-Log anzeigen', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const logMessage = mockLogger.log.mock.calls[0][0];
      // Handler loggt erste 7 Zeichen (blh_xxx) plus "..."
      expect(logMessage).toMatch(/prefix: blh_[a-z0-9]{3}\.\.\./);
    });

    it('sollte Passwort-Hash via Repository speichern', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      // PasswordHash wird via Repository-Methode gespeichert (Security by Design)
      expect(mockUserRepository.setPasswordHash).toHaveBeenCalledWith(
        expect.objectContaining({ value: expect.any(String) }), // UserId
        MOCK_BCRYPT_HASH,
        expect.anything(), // Transaction Context
      );
    });

    it('sollte UserAggregate OHNE passwordHash erstellen', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const savedUser = mockUserRepository.save.mock.calls[0][0] as UserAggregate;
      // UserAggregate hat kein passwordHash Property (Security by Design)
      expect((savedUser as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit sehr langem Passwort funktionieren', async () => {
      // Given (Arrange)
      const longPassword = 'A'.repeat(100);
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: longPassword,
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('sollte mit Sonderzeichen im Passwort funktionieren', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin',
        password: 'P@$$w0rd!#%^&*()',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('sollte Underscore im Nutzernamen akzeptieren', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin_user',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.user.username).toBe('admin_user');
    });

    it('sollte numerischen Nutzernamen akzeptieren', async () => {
      // Given (Arrange)
      const command = CompleteSetupCommand.create({
        username: 'admin123',
        password: 'SecurePassword123!',
      }).value!;

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value!.user.username).toBe('admin123');
    });
  });
});
