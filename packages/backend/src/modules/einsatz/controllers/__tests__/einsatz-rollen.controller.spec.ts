// @ts-nocheck
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { EinsatzController } from '../einsatz.controller';

describe('EinsatzController - Rollen Endpoints', () => {
  let controller: EinsatzController;
  let mockCommandBus: any;
  let mockQueryBus: any;
  let mockGetTeilnehmerHandler: any;
  let mockUpdateEinsatzRollenHandler: any;
  let mockGetEinsatzRollenQueryHandler: any;

  beforeEach(() => {
    mockCommandBus = { execute: jest.fn() };
    mockQueryBus = { execute: jest.fn() };
    mockGetTeilnehmerHandler = { execute: jest.fn() };
    mockUpdateEinsatzRollenHandler = { execute: jest.fn() };
    mockGetEinsatzRollenQueryHandler = { execute: jest.fn() };

    controller = new EinsatzController(mockCommandBus, mockQueryBus, mockGetTeilnehmerHandler, mockUpdateEinsatzRollenHandler, mockGetEinsatzRollenQueryHandler);
  });

  describe('GET :id/rollen', () => {
    it('should return rollen for einsatz', async () => {
      const rollen = [
        { userId: 'user-1', userName: 'einsatzleiter', rolle: 'BEFEHLSGEBER' },
        { userId: 'user-2', userName: 'melder', rolle: 'ERSTELLER' },
      ];
      mockGetEinsatzRollenQueryHandler.execute.mockResolvedValue(Result.ok(rollen));

      const result = await controller.getRollen('einsatz-1');

      expect(result).toEqual(rollen);
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no rollen assigned', async () => {
      mockGetEinsatzRollenQueryHandler.execute.mockResolvedValue(Result.ok([]));

      const result = await controller.getRollen('einsatz-1');

      expect(result).toEqual([]);
    });

    it('should throw NotFoundException when einsatz not found', async () => {
      mockGetEinsatzRollenQueryHandler.execute.mockResolvedValue(Result.fail('Einsatz mit ID xyz nicht gefunden'));

      await expect(controller.getRollen('xyz')).rejects.toThrow(NotFoundException);
    });
  });

  describe('PUT :id/rollen', () => {
    const updateDto = {
      zuweisungen: [
        { userId: 'user-1', rolle: 'BEFEHLSGEBER' },
        { userId: 'user-2', rolle: 'EMPFAENGER' },
      ],
    };

    it('should update rollen and return updated list', async () => {
      const updatedRollen = [
        { userId: 'user-1', userName: 'einsatzleiter', rolle: 'BEFEHLSGEBER' },
        { userId: 'user-2', userName: 'gruppenfuehrer', rolle: 'EMPFAENGER' },
      ];

      mockUpdateEinsatzRollenHandler.execute.mockResolvedValue(Result.ok(undefined));
      mockGetEinsatzRollenQueryHandler.execute.mockResolvedValue(Result.ok(updatedRollen));

      const result = await controller.updateRollen('einsatz-1', updateDto);

      expect(result).toEqual(updatedRollen);
      expect(mockUpdateEinsatzRollenHandler.execute).toHaveBeenCalled();
    });

    it('should throw NotFoundException when einsatz not found during update', async () => {
      mockUpdateEinsatzRollenHandler.execute.mockResolvedValue(Result.fail('Einsatz mit ID xyz nicht gefunden'));

      await expect(controller.updateRollen('xyz', updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException on invalid rolle', async () => {
      mockUpdateEinsatzRollenHandler.execute.mockResolvedValue(Result.fail('Ungueltige Rolle: INVALID'));

      await expect(
        controller.updateRollen('einsatz-1', {
          zuweisungen: [{ userId: 'user-1', rolle: 'INVALID' }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException on duplicate user IDs', async () => {
      mockUpdateEinsatzRollenHandler.execute.mockResolvedValue(Result.fail('Doppelte User-IDs in Zuweisungen'));

      await expect(
        controller.updateRollen('einsatz-1', {
          zuweisungen: [
            { userId: 'user-1', rolle: 'BEFEHLSGEBER' },
            { userId: 'user-1', rolle: 'ERSTELLER' },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle empty zuweisungen (remove all)', async () => {
      mockUpdateEinsatzRollenHandler.execute.mockResolvedValue(Result.ok(undefined));
      mockGetEinsatzRollenQueryHandler.execute.mockResolvedValue(Result.ok([]));

      const result = await controller.updateRollen('einsatz-1', { zuweisungen: [] });

      expect(result).toEqual([]);
    });

    // NOTE: WebSocket event emission for RolleGeaendert is now handled by
    // RolleGeaendertWebsocketEventAdapter (Story 5.4 AC3 architecture correction).
    // Tests for WebSocket emission are in the adapter's test file.
  });
});
