import { ForbiddenException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { CanMutateEinsatzQuery, GetEinsatzByIdQuery } from '@/application/einsatz/queries';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { EinsatzController } from '../einsatz.controller';

describe('EinsatzController - Mutation Authorization', () => {
  let controller: EinsatzController;
  let mockCommandBus: { execute: jest.Mock };
  let mockQueryBus: { execute: jest.Mock };
  let mockGetTeilnehmerHandler: { execute: jest.Mock };
  let mockUpdateEinsatzRollenHandler: { execute: jest.Mock };
  let mockGetEinsatzRollenQueryHandler: { execute: jest.Mock };

  const einsatzId = 'clw3h8x9y0000qwertyuiopas';
  const currentUser: ValidatedUser = {
    userId: 'user-123',
    role: 'USER',
  };

  const einsatzDto = {
    id: einsatzId,
    nummer: 'E2026-001',
    alarmstichwort: 'Test',
    status: 'ANGELEGT',
    createdBy: currentUser.userId,
    createdAt: new Date('2026-03-04T10:00:00.000Z'),
  };

  beforeEach(() => {
    mockCommandBus = { execute: jest.fn() };
    mockQueryBus = { execute: jest.fn() };
    mockGetTeilnehmerHandler = { execute: jest.fn() };
    mockUpdateEinsatzRollenHandler = { execute: jest.fn() };
    mockGetEinsatzRollenQueryHandler = { execute: jest.fn() };

    controller = new EinsatzController(mockCommandBus, mockQueryBus, mockGetTeilnehmerHandler, mockUpdateEinsatzRollenHandler, mockGetEinsatzRollenQueryHandler);
  });

  const setupQueryBus = (isAuthorized: boolean) => {
    mockQueryBus.execute.mockImplementation((query: unknown) => {
      if (query instanceof CanMutateEinsatzQuery) {
        return Promise.resolve(Result.ok(isAuthorized));
      }
      if (query instanceof GetEinsatzByIdQuery) {
        return Promise.resolve(Result.ok(einsatzDto));
      }
      return Promise.resolve(Result.ok(undefined));
    });
  };

  describe('deny path (403)', () => {
    it('should deny update when user is not authorized', async () => {
      setupQueryBus(false);

      await expect(controller.update(einsatzId, { beschreibung: 'Update' }, currentUser)).rejects.toThrow(ForbiddenException);
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should deny start when user is not authorized', async () => {
      setupQueryBus(false);

      await expect(controller.start(einsatzId, currentUser)).rejects.toThrow(ForbiddenException);
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should deny complete when user is not authorized', async () => {
      setupQueryBus(false);

      await expect(controller.complete(einsatzId, currentUser)).rejects.toThrow(ForbiddenException);
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });

    it('should deny archive when user is not authorized', async () => {
      setupQueryBus(false);

      await expect(controller.archive(einsatzId, currentUser)).rejects.toThrow(ForbiddenException);
      expect(mockCommandBus.execute).not.toHaveBeenCalled();
    });
  });

  describe('allow path', () => {
    beforeEach(() => {
      setupQueryBus(true);
      mockCommandBus.execute.mockResolvedValue(Result.ok(undefined));
    });

    it('should allow update when user is authorized', async () => {
      const result = await controller.update(einsatzId, { beschreibung: 'Update' }, currentUser);

      expect(result.id).toBe(einsatzId);
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should allow start when user is authorized', async () => {
      const result = await controller.start(einsatzId, currentUser);

      expect(result.id).toBe(einsatzId);
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should allow complete when user is authorized', async () => {
      const result = await controller.complete(einsatzId, currentUser);

      expect(result.id).toBe(einsatzId);
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });

    it('should allow archive when user is authorized', async () => {
      const result = await controller.archive(einsatzId, currentUser);

      expect(result.id).toBe(einsatzId);
      expect(mockCommandBus.execute).toHaveBeenCalledTimes(1);
    });
  });
});
