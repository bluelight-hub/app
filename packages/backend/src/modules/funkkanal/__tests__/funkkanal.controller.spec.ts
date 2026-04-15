// @ts-nocheck
import { ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import { FunkkanalController } from '../funkkanal.controller';

const userStub = { userId: 'user-1' };

function aggregateStub(overrides: Partial<{ id: string; name: string; sortIndex: number }> = {}) {
  const id = overrides.id ?? 'kanal-1';
  return {
    kanal: {
      id: { value: id },
      einsatzId: { value: 'einsatz-1' },
      name: overrides.name ?? 'Führung 1',
      details: { type: 'tmo', sprechgruppe: 'BOS-1' },
      status: 'aktiv',
      zweck: undefined,
      sortIndex: overrides.sortIndex ?? 0,
      createdAt: new Date('2026-04-14T12:00:00.000Z'),
      updatedAt: new Date('2026-04-14T12:00:00.000Z'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    },
    zuordnungen: [],
  };
}

describe('FunkkanalController', () => {
  let controller: FunkkanalController;
  let createHandler: any;
  let renameHandler: any;
  let changeDetailsHandler: any;
  let setZweckHandler: any;
  let setSortIndexHandler: any;
  let activateHandler: any;
  let deactivateHandler: any;
  let archiveHandler: any;
  let reorderHandler: any;
  let getKanalplanHandler: any;
  let getByIdHandler: any;

  beforeEach(() => {
    createHandler = { execute: jest.fn() };
    renameHandler = { execute: jest.fn() };
    changeDetailsHandler = { execute: jest.fn() };
    setZweckHandler = { execute: jest.fn() };
    setSortIndexHandler = { execute: jest.fn() };
    activateHandler = { execute: jest.fn() };
    deactivateHandler = { execute: jest.fn() };
    archiveHandler = { execute: jest.fn() };
    reorderHandler = { execute: jest.fn() };
    getKanalplanHandler = { execute: jest.fn() };
    getByIdHandler = { execute: jest.fn() };

    controller = new FunkkanalController(
      createHandler,
      renameHandler,
      changeDetailsHandler,
      setZweckHandler,
      setSortIndexHandler,
      activateHandler,
      deactivateHandler,
      archiveHandler,
      reorderHandler,
      getKanalplanHandler,
      getByIdHandler,
    );
  });

  describe('GET /einsatz/:einsatzId/funkkanaele', () => {
    it('liefert die Liste aller Funkkanäle', async () => {
      getKanalplanHandler.execute.mockResolvedValue(Result.ok([aggregateStub()]));
      const result = await controller.list('einsatz-1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('kanal-1');
      expect(result[0].einsatzId).toBe('einsatz-1');
    });

    it('reicht includeArchived=true an die Query weiter', async () => {
      getKanalplanHandler.execute.mockResolvedValue(Result.ok([]));
      await controller.list('einsatz-1', 'true');
      const query = getKanalplanHandler.execute.mock.calls[0][0];
      expect(query.includeArchived).toBe(true);
    });
  });

  describe('GET /einsatz/:einsatzId/funkkanaele/:kanalId', () => {
    it('liefert einen Funkkanal', async () => {
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const result = await controller.getById('einsatz-1', 'kanal-1');
      expect(result.id).toBe('kanal-1');
    });

    it('wirft 404 wenn der Kanal nicht existiert', async () => {
      getByIdHandler.execute.mockResolvedValue(Result.ok(null));
      await expect(controller.getById('einsatz-1', 'kanal-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /einsatz/:einsatzId/funkkanaele', () => {
    it('legt einen Funkkanal an', async () => {
      createHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const dto: any = { name: 'Führung 1', details: { type: 'tmo', sprechgruppe: 'BOS-1' } };
      const result = await controller.create('einsatz-1', dto, userStub as any);
      expect(result.id).toBe('kanal-1');
      const command = createHandler.execute.mock.calls[0][0];
      expect(command.einsatzId).toBe('einsatz-1');
      expect(command.userId).toBe('user-1');
    });

    it('wirft 409 bei Namens-Konflikt', async () => {
      createHandler.execute.mockResolvedValue(Result.fail('Kanalname bereits vergeben'));
      const dto: any = { name: 'Führung 1', details: { type: 'tmo', sprechgruppe: 'BOS-1' } };
      await expect(controller.create('einsatz-1', dto, userStub as any)).rejects.toThrow(ConflictException);
    });
  });

  describe('PATCH /einsatz/:einsatzId/funkkanaele/:kanalId', () => {
    it('dispatcht rename wenn name gesetzt ist', async () => {
      renameHandler.execute.mockResolvedValue(Result.ok(aggregateStub({ name: 'Neu' })));
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub({ name: 'Neu' })));
      const result = await controller.update('einsatz-1', 'kanal-1', { name: 'Neu' } as any, userStub as any);
      expect(renameHandler.execute).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Neu');
    });

    it('dispatcht status=aktiv an activate', async () => {
      activateHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      await controller.update('einsatz-1', 'kanal-1', { status: 'aktiv' } as any, userStub as any);
      expect(activateHandler.execute).toHaveBeenCalledTimes(1);
      expect(deactivateHandler.execute).not.toHaveBeenCalled();
    });

    it('dispatcht status=inaktiv an deactivate', async () => {
      deactivateHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      await controller.update('einsatz-1', 'kanal-1', { status: 'inaktiv' } as any, userStub as any);
      expect(deactivateHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('mappt "archiviert" Fehler auf 422', async () => {
      renameHandler.execute.mockResolvedValue(Result.fail('Archivierter Kanal kann nicht geändert werden'));
      await expect(controller.update('einsatz-1', 'kanal-1', { name: 'X' } as any, userStub as any)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('DELETE /einsatz/:einsatzId/funkkanaele/:kanalId', () => {
    it('archiviert den Kanal', async () => {
      archiveHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      await controller.archive('einsatz-1', 'kanal-1', userStub as any);
      expect(archiveHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('mappt "Funkkanal nicht gefunden" auf 404', async () => {
      archiveHandler.execute.mockResolvedValue(Result.fail('Funkkanal nicht gefunden'));
      await expect(controller.archive('einsatz-1', 'kanal-x', userStub as any)).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /einsatz/:einsatzId/funkkanaele/reorder', () => {
    it('löst Reorder aus und liefert die neue Liste', async () => {
      reorderHandler.execute.mockResolvedValue(Result.ok(undefined));
      getKanalplanHandler.execute.mockResolvedValue(Result.ok([aggregateStub({ id: 'kanal-1', sortIndex: 1 }), aggregateStub({ id: 'kanal-2', sortIndex: 0 })]));
      const dto: any = {
        ordering: [
          { id: 'kanal-2', sortIndex: 0 },
          { id: 'kanal-1', sortIndex: 1 },
        ],
      };
      const result = await controller.reorder('einsatz-1', dto, userStub as any);
      expect(reorderHandler.execute).toHaveBeenCalledTimes(1);
      expect(result).toHaveLength(2);
      const cmd = reorderHandler.execute.mock.calls[0][0];
      expect(cmd.ordering[0]).toEqual({ kanalId: 'kanal-2', sortIndex: 0 });
    });
  });
});
