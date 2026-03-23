import { Result } from '@domain/common/result';
import { Permission } from '@domain/value-objects/permission';
import { UserAggregate } from '@domain/aggregates/user.aggregate';
import { UserRole } from '@domain/value-objects/user-role';
import { Username } from '@domain/value-objects/username';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { RevokePermissionCommand } from '../revoke-permission.command';
import { RevokePermissionHandler } from '../revoke-permission.handler';

const VALID_USER_ID = 'cltest0000000000000000user1';
const VALID_ADMIN_ID = 'cltest0000000000000000admin';

function createTestUserWithPermission(permissionValue: string) {
  const username = Username.create('testuser').value!;
  const role = UserRole.USER();
  const user = UserAggregate.create(username, role).value!;
  const perm = Permission.create(permissionValue).value!;
  user.grantPermission(perm, user.id);
  user.clearDomainEvents();
  return user;
}

describe('RevokePermissionHandler', () => {
  let handler: RevokePermissionHandler;
  let mockUserRepository: jest.Mocked<Pick<IUserRepository, 'findById' | 'save'>>;
  let mockLogger: jest.Mocked<ILogger>;

  beforeEach(() => {
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    mockUserRepository = {
      findById: jest.fn(),
      save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    };

    handler = Object.create(RevokePermissionHandler.prototype);
    (handler as any).userRepository = mockUserRepository;
    (handler as any).logger = mockLogger;
  });

  it('sollte Permission erfolgreich entziehen', async () => {
    const user = createTestUserWithPermission('nav:stammdaten');
    mockUserRepository.findById.mockResolvedValue(Result.ok(user));

    const command = RevokePermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      revokedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.events).toBeDefined();
    expect(user.permissions.length).toBe(0);
  });

  it('sollte fehlschlagen wenn Permission nicht vergeben', async () => {
    const username = Username.create('testuser').value!;
    const user = UserAggregate.create(username, UserRole.USER()).value!;
    user.clearDomainEvents();
    mockUserRepository.findById.mockResolvedValue(Result.ok(user));

    const command = RevokePermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      revokedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('not granted');
  });

  it('sollte fehlschlagen wenn User nicht gefunden', async () => {
    mockUserRepository.findById.mockResolvedValue(Result.ok(null));

    const command = RevokePermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      revokedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('not found');
  });

  it('sollte fehlschlagen wenn repository.save() fehlschlaegt', async () => {
    const user = createTestUserWithPermission('nav:stammdaten');
    mockUserRepository.findById.mockResolvedValue(Result.ok(user));
    mockUserRepository.save.mockResolvedValue(Result.fail('Datenbankfehler'));

    const command = RevokePermissionCommand.create({
      userId: VALID_USER_ID,
      permission: 'nav:stammdaten',
      revokedBy: VALID_ADMIN_ID,
    }).value!;

    const result = await (handler as any).executeInTransaction(command, {});

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Datenbankfehler');
    expect(mockLogger.error).toHaveBeenCalledWith('Failed to save user after permission revoke', expect.objectContaining({ phase: 'persistence' }));
  });
});

describe('RevokePermissionCommand', () => {
  it('sollte validen Command erstellen', () => {
    const result = RevokePermissionCommand.create({
      userId: 'user-1',
      permission: 'nav:stammdaten',
      revokedBy: 'admin-1',
    });
    expect(result.isSuccess).toBe(true);
  });

  it('sollte fehlschlagen ohne revokedBy', () => {
    const result = RevokePermissionCommand.create({
      userId: 'user-1',
      permission: 'nav:stammdaten',
      revokedBy: '',
    });
    expect(result.isFailure).toBe(true);
  });
});
