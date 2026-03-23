import { Result } from '@domain/common/result';
import { Permission } from '@domain/value-objects/permission';
import { UserAggregate } from '@domain/aggregates/user.aggregate';
import { UserRole } from '@domain/value-objects/user-role';
import { Username } from '@domain/value-objects/username';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { GrantPermissionCommand } from '../grant-permission.command';
import { GrantPermissionHandler } from '../grant-permission.handler';

// Mock-IDs die cuid-Format haben
const VALID_USER_ID = 'cltest0000000000000000user1';
const VALID_ADMIN_ID = 'cltest0000000000000000admin';

/** Erstellt eine Test-UserAggregate-Instanz */
function createTestUser() {
  const username = Username.create('testuser').value!;
  const role = UserRole.USER();
  return UserAggregate.create(username, role).value!;
}

describe('GrantPermissionHandler', () => {
  let handler: GrantPermissionHandler;
  let mockUserRepository: jest.Mocked<Pick<IUserRepository, 'findById' | 'save'>>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    // Handler direkt instanziieren (TransactionalCommandHandler umgehen)
    handler = Object.create(GrantPermissionHandler.prototype);
    (handler as any).userRepository = mockUserRepository;
    (handler as any).logger = mockLogger;
  });

  it('sollte Permission erfolgreich vergeben', async () => {
    const user = createTestUser();
    mockUserRepository.findById.mockResolvedValue(Result.ok(user));

    const command = GrantPermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      grantedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    // Erfolg: gibt { result, events } zurueck (kein Result.fail)
    expect(result.events).toBeDefined();
    expect(result.events.length).toBeGreaterThan(0);
    expect(user.permissions.some((p: Permission) => p.value === 'nav:stammdaten')).toBe(true);
  });

  it('sollte fehlschlagen bei ungueltigem Permission-Format', async () => {
    const command = GrantPermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'INVALID',
      grantedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Permission Format');
  });

  it('sollte fehlschlagen wenn User nicht gefunden', async () => {
    mockUserRepository.findById.mockResolvedValue(Result.ok(null));

    const command = GrantPermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      grantedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('not found');
  });

  it('sollte fehlschlagen bei Duplikat-Permission', async () => {
    const user = createTestUser();
    const perm = Permission.create('nav:stammdaten').value!;
    const grantedBy = user.id; // Verwende User-ID als grantedBy
    user.grantPermission(perm, grantedBy);
    user.clearDomainEvents(); // Events loeschen fuer sauberen Test
    mockUserRepository.findById.mockResolvedValue(Result.ok(user));

    const command = GrantPermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      grantedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('already granted');
  });

  it('sollte fehlschlagen wenn repository.save() fehlschlaegt', async () => {
    const user = createTestUser();
    mockUserRepository.findById.mockResolvedValue(Result.ok(user));
    mockUserRepository.save.mockResolvedValue(Result.fail('Datenbankfehler'));

    const command = GrantPermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      grantedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Datenbankfehler');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to save user after permission grant', expect.objectContaining({ phase: 'persistence' }));
  });
});

describe('GrantPermissionCommand', () => {
  it('sollte validen Command erstellen', () => {
    const result = GrantPermissionCommand.create({
      userId: 'user-1',
      permission: 'nav:stammdaten',
      grantedBy: 'admin-1',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.value!.userId).toBe('user-1');
    expect(result.value!.permission).toBe('nav:stammdaten');
  });

  it('sollte fehlschlagen ohne userId', () => {
    const result = GrantPermissionCommand.create({
      userId: '',
      permission: 'nav:stammdaten',
      grantedBy: 'admin-1',
    });
    expect(result.isFailure).toBe(true);
  });

  it('sollte fehlschlagen ohne permission', () => {
    const result = GrantPermissionCommand.create({
      userId: 'user-1',
      permission: '',
      grantedBy: 'admin-1',
    });
    expect(result.isFailure).toBe(true);
  });
});
