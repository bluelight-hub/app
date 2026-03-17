import { Result } from '@domain/common/result';
import { UserRole } from '@/generated/prisma/client';
import { CreateInviteHandler } from '@/application/admin/commands/create-invite.handler';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { CreateOneTimeInviteCliCommand } from '../create-one-time-invite.command';

describe('CreateOneTimeInviteCliCommand', () => {
  const fixedNow = new Date('2026-03-17T10:00:00.000Z');

  let command: CreateOneTimeInviteCliCommand;
  let mockPrismaService: {
    user: {
      findUnique: jest.Mock;
    };
  };
  let mockCreateInviteHandler: {
    execute: jest.Mock;
  };
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();

    mockPrismaService = {
      user: {
        findUnique: jest.fn(),
      },
    };

    mockCreateInviteHandler = {
      execute: jest.fn().mockResolvedValue(
        Result.ok({
          id: 'inv_123',
          code: 'ABCD1234',
          expiresAt: '2026-03-24T10:00:00.000Z',
          maxUses: 1,
          useCount: 0,
          label: 'Ring 2 Zugang',
          createdAt: '2026-03-17T10:00:00.000Z',
          deepLink: 'bluelight://connect?invite=ABCD1234',
          webLink: 'https://app.example.de?invite=ABCD1234',
        }),
      ),
    };

    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    command = new CreateOneTimeInviteCliCommand(mockPrismaService as unknown as PrismaService, mockCreateInviteHandler as unknown as CreateInviteHandler);
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleLogSpy.mockRestore();
  });

  it('should create a one-time invite for username with default expiry', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'usr_123',
      username: 'admin',
      role: UserRole.ADMIN,
      isDeleted: false,
    });

    await command.run(['--username', 'admin', '--label', 'Ring 2 Zugang']);

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { username: 'admin' },
      select: {
        id: true,
        username: true,
        role: true,
        isDeleted: true,
      },
    });
    expect(mockCreateInviteHandler.execute).toHaveBeenCalledTimes(1);

    const createCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
    expect(createCommand.createdById).toBe('usr_123');
    expect(createCommand.maxUses).toBe(1);
    expect(createCommand.label).toBe('Ring 2 Zugang');
    expect(createCommand.expiresAt.toISOString()).toBe('2026-03-24T10:00:00.000Z');
  });

  it('should create a one-time invite for user id with explicit expiry', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'usr_999',
      username: 'superadmin',
      role: UserRole.SUPER_ADMIN,
      isDeleted: false,
    });

    await command.run(['--user-id', 'usr_999', '--expires-at', '2026-03-18T12:30:00.000Z']);

    expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'usr_999' },
      select: {
        id: true,
        username: true,
        role: true,
        isDeleted: true,
      },
    });

    const createCommand = mockCreateInviteHandler.execute.mock.calls[0][0];
    expect(createCommand.expiresAt.toISOString()).toBe('2026-03-18T12:30:00.000Z');
  });

  it('should reject non-admin creators', async () => {
    mockPrismaService.user.findUnique.mockResolvedValue({
      id: 'usr_user',
      username: 'normal-user',
      role: UserRole.USER,
      isDeleted: false,
    });

    await expect(command.run(['--username', 'normal-user'])).rejects.toThrow('Benutzer "normal-user" ist kein Administrator (Rolle: USER)');
    expect(mockCreateInviteHandler.execute).not.toHaveBeenCalled();
  });

  it('should reject conflicting expiry arguments', async () => {
    await expect(command.run(['--username', 'admin', '--days', '3', '--expires-at', '2026-03-18T12:30:00.000Z'])).rejects.toThrow('--expires-at und --days dürfen nicht gleichzeitig gesetzt werden');
    expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
  });
});
