// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { Result } from '@domain/common/result';
import type { UserAggregate } from '@domain/aggregates/user.aggregate';
import { INVITE_CODE_REPOSITORY, LOGGER, OUTBOX_REPOSITORY, SERVER_ACCESS_TOKEN_REPOSITORY, USER_REPOSITORY } from '@infrastructure/di-tokens';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { HibpService } from '@infrastructure/password/hibp.service';
import { CompleteSetupHandler } from '../complete-setup.handler';
import { CompleteSetupCommand } from '../complete-setup.command';
import { BCRYPT_COST_FACTOR_PASSWORD, BCRYPT_COST_FACTOR_TOKEN } from '@infrastructure/config/security.constants';
import { expectDefined, expectSuccess, getMockCallArg, getRequiredLogMessage } from './helpers/result-test.helper';

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
    existsByUsername: jest.Mock;
    countByRoles: jest.Mock;
    countActiveByRoles: jest.Mock;
    setPasswordHash: jest.Mock;
  };
  let mockTokenRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByHash: jest.Mock;
    findActive: jest.Mock;
  };
  let mockInviteCodeRepository: {
    save: jest.Mock;
    findById: jest.Mock;
    findByCode: jest.Mock;
    findAllActive: jest.Mock;
    findByCreator: jest.Mock;
    existsByCode: jest.Mock;
    countActive: jest.Mock;
    findAll: jest.Mock;
    markAsUsedAtomic: jest.Mock;
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
  let mockHibpService: {
    checkPassword: jest.Mock;
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset bcrypt mock mit korrektem 60-Zeichen Format
    (bcrypt.hash as jest.Mock).mockResolvedValue(MOCK_BCRYPT_HASH);

    mockUserRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByUsername: jest.fn(),
      existsByUsername: jest.fn().mockResolvedValue(Result.ok(false)),
      countByRoles: jest.fn().mockResolvedValue(Result.ok(0)),
      countActiveByRoles: jest.fn().mockResolvedValue(Result.ok(0)), // Default: Kein AKTIVER Admin existiert
      setPasswordHash: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    mockTokenRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByHash: jest.fn(),
      findActive: jest.fn(),
    };

    mockInviteCodeRepository = {
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
      findById: jest.fn(),
      findByCode: jest.fn(),
      findAllActive: jest.fn(),
      findByCreator: jest.fn(),
      existsByCode: jest.fn(),
      countActive: jest.fn(),
      findAll: jest.fn(),
      markAsUsedAtomic: jest.fn(),
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

    // Mock HIBP Service - Default: Passwort nicht kompromittiert
    mockHibpService = {
      checkPassword: jest.fn().mockResolvedValue({
        isCompromised: false,
        occurrences: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompleteSetupHandler,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutboxRepository },
        { provide: USER_REPOSITORY, useValue: mockUserRepository },
        { provide: SERVER_ACCESS_TOKEN_REPOSITORY, useValue: mockTokenRepository },
        { provide: INVITE_CODE_REPOSITORY, useValue: mockInviteCodeRepository },
        { provide: LOGGER, useValue: mockLogger },
        { provide: HibpService, useValue: mockHibpService },
      ],
    }).compile();

    handler = module.get<CompleteSetupHandler>(CompleteSetupHandler);
  });

  describe('execute', () => {
    it('sollte Setup erfolgreich durchfuehren mit gueltigen Daten', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeDefined();
      expect(result.value?.user).toBeDefined();
      expect(result.value?.user.username).toBe('admin');
      expect(result.value?.user.role).toBe('ADMIN');
      expect(result.value?.accessToken).toBeDefined();
      expect(result.value?.accessToken.token).toMatch(/^blh_/);
      expect(result.value?.accessToken.name).toBe('Initial Setup Token');
      // Invite Code assertions
      expect(result.value?.inviteCode).toBeDefined();
      expect(result.value?.inviteCode.code).toMatch(/^[A-Z0-9]{8}$/);
      expect(result.value?.inviteCode.maxUses).toBe(10);
      expect(result.value?.inviteCode.label).toBe('Initial Setup Invite');
      expect(result.value?.inviteCode.expiresAt).toBeDefined();
    });

    it('sollte countActiveByRoles mit korrekten Rollen aufrufen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockUserRepository.countActiveByRoles).toHaveBeenCalledWith(['ADMIN', 'SUPER_ADMIN'], expect.anything());
    });

    it('sollte fehlschlagen wenn Admin bereits existiert (AC5)', async () => {
      // Given (Arrange)
      mockUserRepository.countActiveByRoles.mockResolvedValue(Result.ok(1)); // Admin existiert bereits

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

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
      mockUserRepository.countActiveByRoles.mockResolvedValue(Result.ok(1)); // SUPER_ADMIN counts as admin

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('SETUP_ALREADY_COMPLETED');
    });

    it('sollte fehlschlagen wenn Username bereits existiert', async () => {
      // Given (Arrange)
      mockUserRepository.existsByUsername.mockResolvedValue(Result.ok(true));

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('USERNAME_ALREADY_EXISTS');
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Passwort mit bcrypt hashen (cost 10)', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(bcrypt.hash).toHaveBeenCalledWith('SecurePassword123!', BCRYPT_COST_FACTOR_PASSWORD);
    });

    it('sollte Token mit bcrypt hashen (cost 10)', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      // bcrypt.hash sollte 2x aufgerufen werden: 1x Passwort, 1x Token
      expect(bcrypt.hash).toHaveBeenCalledTimes(2);
      // Zweiter Aufruf ist Token-Hashing (mit blh_ Prefix)
      expect(getMockCallArg<string>(bcrypt.hash as jest.Mock, 1, 0)).toMatch(/^blh_/);
      expect(getMockCallArg<number>(bcrypt.hash as jest.Mock, 1, 1)).toBe(BCRYPT_COST_FACTOR_TOKEN);
    });

    it('sollte Token im Format blh_xxx generieren (AC3)', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.accessToken.token).toMatch(/^blh_[a-z0-9]{24}$/);
    });

    it('sollte Audit-Trail loggen mit User-Kontext und maskiertem Token-Prefix (AC4, 6.9 Fix)', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

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
      expect(commandResult.value?.username).toBe('admin');
    });

    it('sollte Nutzername trimmen', () => {
      // Given (Arrange)
      const commandResult = CompleteSetupCommand.create({
        username: '  admin  ',
        password: 'SecurePassword123!',
      });

      // Then (Assert)
      expect(commandResult.isSuccess).toBe(true);
      expect(commandResult.value?.username).toBe('admin');
    });
  });

  describe('Transaction Behavior', () => {
    it('sollte $transaction auf PrismaService aufrufen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockPrismaService.$transaction).toHaveBeenCalledTimes(1);
    });

    it('sollte User, Token und InviteCode in gleicher Transaktion speichern', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockUserRepository.save).toHaveBeenCalledTimes(1);
      expect(mockTokenRepository.save).toHaveBeenCalledTimes(1);
      expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(1);
      // Alle sollten mit Transaction Context aufgerufen werden
      expect(getMockCallArg(mockUserRepository.save, 0, 1)).toBeDefined();
      expect(getMockCallArg(mockTokenRepository.save, 0, 1)).toBeDefined();
      expect(getMockCallArg(mockInviteCodeRepository.save, 0, 1)).toBeDefined();
    });

    it('sollte Rollback durchfuehren wenn UserRepository.save fehlschlaegt', async () => {
      // Given (Arrange)
      mockUserRepository.save.mockResolvedValue(Result.fail('User konnte nicht gespeichert werden'));

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

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

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Token konnte nicht gespeichert werden');
      expect(mockInviteCodeRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Rollback durchfuehren wenn InviteCodeRepository.save fehlschlaegt', async () => {
      // Given (Arrange)
      mockInviteCodeRepository.save.mockResolvedValue(Result.fail('InviteCode konnte nicht gespeichert werden'));

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('InviteCode konnte nicht gespeichert werden');
    });

    it('sollte Rollback durchfuehren wenn Outbox-Speicherung fehlschlaegt', async () => {
      // Given (Arrange)
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        mockOutboxRepository.save.mockRejectedValue(new Error('Outbox-Speicherfehler'));
        return await callback({});
      });

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

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
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(mockOutboxRepository.save).toHaveBeenCalledTimes(1);

      const events = getMockCallArg(mockOutboxRepository.save, 0, 0);
      expect(Array.isArray(events)).toBe(true);
      expect(events.length).toBeGreaterThanOrEqual(1);
    });

    it('sollte UserCreatedEvent emittieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const events = getMockCallArg(mockOutboxRepository.save, 0, 0);
      const userEvent = events.find((e: { constructor: { name: string } }) => e.constructor.name === 'UserCreatedEvent');
      expect(userEvent).toBeDefined();
    });

    it('sollte ServerAccessTokenCreatedEvent emittieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const events = getMockCallArg(mockOutboxRepository.save, 0, 0);
      const tokenEvent = events.find((e: { constructor: { name: string } }) => e.constructor.name === 'ServerAccessTokenCreatedEvent');
      expect(tokenEvent).toBeDefined();
    });

    it('sollte InviteCodeCreatedEvent emittieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const events = getMockCallArg(mockOutboxRepository.save, 0, 0);
      const inviteEvent = events.find((e: { constructor: { name: string } }) => e.constructor.name === 'InviteCodeCreatedEvent');
      expect(inviteEvent).toBeDefined();
    });
  });

  describe('Security Considerations', () => {
    it('sollte Raw-Token NUR in Response zurueckgeben (nicht in IRGENDEINEM Log)', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const rawToken = result.value?.accessToken.token;

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
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const logMessage = getRequiredLogMessage(mockLogger.log);
      // Handler loggt erste 7 Zeichen (blh_xxx) plus "..."
      expect(logMessage).toMatch(/prefix: blh_[a-z0-9]{3}\.\.\./);
    });

    it('sollte Passwort-Hash via Repository speichern', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

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
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      const savedUser = getMockCallArg(mockUserRepository.save, 0, 0) as UserAggregate;
      // UserAggregate hat kein passwordHash Property (Security by Design)
      expect((savedUser as unknown as Record<string, unknown>).passwordHash).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('sollte mit sehr langem Passwort funktionieren', async () => {
      // Given (Arrange)
      const longPassword = 'A'.repeat(100);
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: longPassword,
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('sollte mit Sonderzeichen im Passwort funktionieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'P@$$w0rd!#%^&*()',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
    });

    it('sollte Underscore im Nutzernamen akzeptieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin_user',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.user.username).toBe('admin_user');
    });

    it('sollte numerischen Nutzernamen akzeptieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin123',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.user.username).toBe('admin123');
    });
  });

  describe('Invite Code Creation', () => {
    it('sollte Invite-Code mit korrekten Defaults erstellen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      expect(result.value?.inviteCode).toBeDefined();
      expect(result.value?.inviteCode.maxUses).toBe(10);
      expect(result.value?.inviteCode.label).toBe('Initial Setup Invite');
    });

    it('sollte Invite-Code mit 7 Tagen Gueltigkeit erstellen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      const beforeExecution = new Date();

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const inviteCode = result.value?.inviteCode;
      expect(inviteCode).toBeDefined();
      expect(inviteCode?.expiresAt).toBeDefined();
      const expiresAt = new Date(expectDefined(expectDefined(inviteCode).expiresAt));
      const expectedMin = new Date(beforeExecution);
      expectedMin.setDate(expectedMin.getDate() + 6); // Mindestens 6 Tage
      const expectedMax = new Date(beforeExecution);
      expectedMax.setDate(expectedMax.getDate() + 8); // Hoechstens 8 Tage (Buffer)

      expect(expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMin.getTime());
      expect(expiresAt.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
    });

    it('sollte 8-stelligen alphanumerischen Code generieren', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      // InviteCodeValue generiert 8-stellige alphanumerische Codes (Grossbuchstaben + Zahlen)
      expect(result.value?.inviteCode.code).toMatch(/^[A-Z0-9]{8}$/);
    });

    it('sollte Invite-Code im Audit-Log maskiert ausgeben', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const rawCode = result.value?.inviteCode.code;

      // Der vollstaendige Code sollte NICHT in den Logs erscheinen
      const allLogMethods = ['log', 'error', 'warn', 'debug'] as const;
      for (const method of allLogMethods) {
        const calls = mockLogger[method].mock.calls;
        for (const call of calls) {
          for (const arg of call) {
            const argString = typeof arg === 'string' ? arg : JSON.stringify(arg);
            // Pruefe dass der vollstaendige Code nicht geloggt wird
            // (Der maskierte Code wie "ABC1****" ist erlaubt)
            expect(argString).not.toContain(rawCode);
          }
        }
      }
    });

    it('sollte InviteCodeRepository.save mit Aggregate aufrufen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockInviteCodeRepository.save).toHaveBeenCalledTimes(1);
      const savedInviteCode = getMockCallArg(mockInviteCodeRepository.save, 0, 0);
      expect(savedInviteCode).toBeDefined();
      expect(savedInviteCode.code).toBeDefined();
      expect(savedInviteCode.maxUses).toBe(10);
      expect(savedInviteCode.label).toBe('Initial Setup Invite');
    });

    it('sollte Invite-Code mit Admin-User-ID als Ersteller erstellen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isSuccess).toBe(true);
      const savedInviteCode = getMockCallArg(mockInviteCodeRepository.save, 0, 0);
      // Der createdById sollte die User-ID des Admin sein
      expect(savedInviteCode.createdById).toBe(result.value?.user.id);
    });
  });

  describe('HIBP Password Breach Check (NIST SP 800-63B-4)', () => {
    it('sollte Setup ablehnen wenn Passwort in bekanntem Breach gefunden wurde', async () => {
      // Given (Arrange)
      mockHibpService.checkPassword.mockResolvedValue({
        isCompromised: true,
        occurrences: 3730471, // "password" wurde 3.7 Mio mal gefunden
      });

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'password', // Bekanntes kompromittiertes Passwort
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert)
      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('PASSWORD_COMPROMISED');
      // Kein User sollte erstellt worden sein
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });

    it('sollte Warning loggen wenn Passwort kompromittiert ist', async () => {
      // Given (Arrange)
      mockHibpService.checkPassword.mockResolvedValue({
        isCompromised: true,
        occurrences: 1000000,
      });

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'CompromisedPassword123',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Password breach detected'));
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('1000000'));
    });

    it('sollte Setup fortsetzen wenn HIBP API fehlschlaegt (Graceful Degradation)', async () => {
      // Given (Arrange): HIBP API Fehler (z.B. Rate Limiting, Timeout)
      mockHibpService.checkPassword.mockResolvedValue({
        isCompromised: false,
        occurrences: 0,
        error: 'HIBP API error: 429 Too Many Requests',
      });

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      const result = await handler.execute(command);

      // Then (Assert): Setup sollte trotzdem erfolgreich sein
      expect(result.isSuccess).toBe(true);
      expect(result.value?.user.username).toBe('admin');
      // Warning sollte geloggt werden
      expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('HIBP check failed'));
    });

    it('sollte HIBP Service mit Passwort aufrufen', async () => {
      // Given (Arrange)
      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'MySecureTestPassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert)
      expect(mockHibpService.checkPassword).toHaveBeenCalledTimes(1);
      expect(mockHibpService.checkPassword).toHaveBeenCalledWith('MySecureTestPassword123!');
    });

    it('sollte HIBP Check VOR Password-Hashing ausfuehren', async () => {
      // Given (Arrange)
      const callOrder: string[] = [];
      mockHibpService.checkPassword.mockImplementation(async () => {
        callOrder.push('hibp');
        return { isCompromised: false, occurrences: 0 };
      });
      (bcrypt.hash as jest.Mock).mockImplementation(async () => {
        callOrder.push('bcrypt');
        return MOCK_BCRYPT_HASH;
      });

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'SecurePassword123!',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert): HIBP sollte vor bcrypt aufgerufen werden
      expect(callOrder.indexOf('hibp')).toBeLessThan(callOrder.indexOf('bcrypt'));
    });

    it('sollte nicht speichern wenn Passwort kompromittiert ist', async () => {
      // Given (Arrange)
      mockHibpService.checkPassword.mockResolvedValue({
        isCompromised: true,
        occurrences: 500,
      });

      const command = expectSuccess(
        CompleteSetupCommand.create({
          username: 'admin',
          password: 'WeakPassword',
        }),
      );

      // When (Act)
      await handler.execute(command);

      // Then (Assert): Keine Repositories sollten aufgerufen worden sein
      expect(mockUserRepository.save).not.toHaveBeenCalled();
      expect(mockTokenRepository.save).not.toHaveBeenCalled();
      expect(mockInviteCodeRepository.save).not.toHaveBeenCalled();
      expect(mockOutboxRepository.save).not.toHaveBeenCalled();
    });
  });
});
