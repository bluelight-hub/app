// @ts-nocheck
/**
 * Unit Tests für DisconnectHiOrgHandler.
 *
 * @module application/integrations/commands/disconnect-hiorg/__tests__
 */

import { Result } from '@domain/common/result';
import { INTEGRATION_TYPES } from '@domain/integrations';
import type { IIntegrationCredentialRepository } from '@domain/integrations/repositories/i-integration-credential.repository';
import type { ILogger } from '@domain/ports/i-logger.port';
import { DisconnectHiOrgHandler } from '../disconnect-hiorg.handler';
import { DisconnectHiOrgCommand } from '../disconnect-hiorg.command';

describe('DisconnectHiOrgHandler', () => {
  let handler: DisconnectHiOrgHandler;
  let mockLogger: jest.Mocked<ILogger>;
  let mockRepository: jest.Mocked<IIntegrationCredentialRepository>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockLogger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockRepository = {
      findByType: jest.fn(),
      save: jest.fn(),
      deleteByType: jest.fn(),
    };

    handler = new DisconnectHiOrgHandler(mockLogger, mockRepository);
  });

  describe('execute', () => {
    it('should disconnect successfully', async () => {
      const command = DisconnectHiOrgCommand.create({ userId: 'admin-user' }).value!;
      mockRepository.deleteByType.mockResolvedValue(Result.ok(undefined));

      const result = await handler.execute(command);

      expect(result.isSuccess).toBe(true);
      expect(result.value!.disconnected).toBe(true);
      expect(result.value!.disconnectedAt).toBeInstanceOf(Date);
      expect(mockRepository.deleteByType).toHaveBeenCalledWith(INTEGRATION_TYPES.HIORG_SERVER);
    });

    it('should fail when repository delete fails', async () => {
      const command = DisconnectHiOrgCommand.create({ userId: 'admin-user' }).value!;
      mockRepository.deleteByType.mockResolvedValue(Result.fail('DB-Fehler'));

      const result = await handler.execute(command);

      expect(result.isFailure).toBe(true);
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should log user who disconnected', async () => {
      const command = DisconnectHiOrgCommand.create({ userId: 'admin-42' }).value!;
      mockRepository.deleteByType.mockResolvedValue(Result.ok(undefined));

      await handler.execute(command);

      expect(mockLogger.log).toHaveBeenCalledWith(expect.stringContaining('admin-42'));
    });
  });

  describe('DisconnectHiOrgCommand', () => {
    it('should create command with valid userId', () => {
      const result = DisconnectHiOrgCommand.create({ userId: 'admin-user' });
      expect(result.isSuccess).toBe(true);
      expect(result.value!.userId).toBe('admin-user');
    });

    it('should fail with empty userId', () => {
      const result = DisconnectHiOrgCommand.create({ userId: '' });
      expect(result.isFailure).toBe(true);
    });
  });
});
