// @ts-nocheck
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { FunkkanalZuordnungController } from '../zuordnung.controller';

const userStub = { userId: 'user-1' };

function aggregateStub(zuordnungen: any[] = []) {
  return {
    kanal: {
      id: { value: 'kanal-1' },
      einsatzId: { value: 'einsatz-1' },
      name: 'Führung 1',
      details: { type: 'tmo', sprechgruppe: 'BOS-1' },
      status: 'aktiv',
      zweck: undefined,
      sortIndex: 0,
      createdAt: new Date('2026-04-14T12:00:00.000Z'),
      updatedAt: new Date('2026-04-14T12:00:00.000Z'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    },
    zuordnungen,
  };
}

function zuordnungStub(rolle: 'primaer' | 'sekundaer' | 'zuhoeren' = 'primaer') {
  return {
    id: { value: 'zo-1' },
    kanalId: { value: 'kanal-1' },
    kraftRef: { kind: 'fahrzeug', fahrzeugId: 'fz-1' },
    rufnameSnapshot: 'Florian 12-1',
    rolle,
    createdAt: new Date('2026-04-14T12:00:00.000Z'),
  };
}

describe('FunkkanalZuordnungController', () => {
  let controller: FunkkanalZuordnungController;
  let zuordneHandler: any;
  let aendereRolleHandler: any;
  let entferneHandler: any;

  beforeEach(() => {
    zuordneHandler = { execute: jest.fn() };
    aendereRolleHandler = { execute: jest.fn() };
    entferneHandler = { execute: jest.fn() };
    controller = new FunkkanalZuordnungController(zuordneHandler, aendereRolleHandler, entferneHandler);
  });

  describe('POST .../zuordnungen', () => {
    it('verdrahtet fahrzeugId in einen fahrzeug-Kraft-Ref', async () => {
      zuordneHandler.execute.mockResolvedValue(Result.ok(aggregateStub([zuordnungStub()])));
      const dto: any = { fahrzeugId: 'fz-1', rolle: 'primaer' };
      const result = await controller.create('einsatz-1', 'kanal-1', dto, userStub as any);
      expect(result.zuordnungen).toHaveLength(1);
      expect(zuordneHandler.execute.mock.calls[0][0].kraft).toEqual({ kind: 'fahrzeug', fahrzeugId: 'fz-1' });
    });

    it('verdrahtet personId in einen person-Kraft-Ref', async () => {
      zuordneHandler.execute.mockResolvedValue(Result.ok(aggregateStub([])));
      const dto: any = { personId: 'p-1', rolle: 'sekundaer' };
      await controller.create('einsatz-1', 'kanal-1', dto, userStub as any);
      expect(zuordneHandler.execute.mock.calls[0][0].kraft).toEqual({ kind: 'person', personId: 'p-1' });
    });

    it('verdrahtet einheitId in einen einheit-Kraft-Ref', async () => {
      zuordneHandler.execute.mockResolvedValue(Result.ok(aggregateStub([])));
      const dto: any = { einheitId: 'e-1', rolle: 'zuhoeren' };
      await controller.create('einsatz-1', 'kanal-1', dto, userStub as any);
      expect(zuordneHandler.execute.mock.calls[0][0].kraft).toEqual({ kind: 'einheit', einheitId: 'e-1' });
    });

    it('mappt "bereits zugeordnet" auf 409', async () => {
      zuordneHandler.execute.mockResolvedValue(Result.fail('Kraft ist bereits diesem Kanal zugeordnet'));
      const dto: any = { fahrzeugId: 'fz-1', rolle: 'primaer' };
      await expect(controller.create('einsatz-1', 'kanal-1', dto, userStub as any)).rejects.toThrow(ConflictException);
    });

    it('mappt "Funkkanal nicht gefunden" auf 404', async () => {
      zuordneHandler.execute.mockResolvedValue(Result.fail('Funkkanal nicht gefunden'));
      const dto: any = { fahrzeugId: 'fz-1', rolle: 'primaer' };
      await expect(controller.create('einsatz-1', 'kanal-x', dto, userStub as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH .../zuordnungen/:zuordnungId', () => {
    it('aktualisiert die Rolle', async () => {
      aendereRolleHandler.execute.mockResolvedValue(Result.ok(aggregateStub([zuordnungStub('sekundaer')])));
      const result = await controller.updateRolle('einsatz-1', 'kanal-1', 'zo-1', { rolle: 'sekundaer' } as any, userStub as any);
      expect(result.zuordnungen[0].rolle).toBe('sekundaer');
    });

    it('mappt "Zuordnung nicht gefunden" auf 404', async () => {
      aendereRolleHandler.execute.mockResolvedValue(Result.fail('Zuordnung nicht gefunden'));
      await expect(controller.updateRolle('einsatz-1', 'kanal-1', 'zo-x', { rolle: 'primaer' } as any, userStub as any)).rejects.toThrow(NotFoundException);
    });

    it('mappt "Archivierter Kanal" auf 422', async () => {
      aendereRolleHandler.execute.mockResolvedValue(Result.fail('Archivierter Kanal kann nicht geändert werden'));
      await expect(controller.updateRolle('einsatz-1', 'kanal-1', 'zo-1', { rolle: 'primaer' } as any, userStub as any)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('DELETE .../zuordnungen/:zuordnungId', () => {
    it('entfernt die Zuordnung', async () => {
      entferneHandler.execute.mockResolvedValue(Result.ok(aggregateStub([])));
      await controller.remove('einsatz-1', 'kanal-1', 'zo-1', userStub as any);
      expect(entferneHandler.execute).toHaveBeenCalledTimes(1);
    });
  });
});
