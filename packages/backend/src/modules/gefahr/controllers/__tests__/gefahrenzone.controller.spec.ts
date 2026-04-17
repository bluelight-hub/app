// @ts-nocheck
import { Test } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { GefahrenzoneController } from '../gefahrenzone.controller';
import { CreateGefahrenzoneHandler } from '@/application/gefahr/commands/create-gefahrenzone/create-gefahrenzone.handler';
import { UpdateGefahrenzoneGeometryHandler } from '@/application/gefahr/commands/update-gefahrenzone-geometry/update-gefahrenzone-geometry.handler';
import { DeleteGefahrenzoneHandler } from '@/application/gefahr/commands/delete-gefahrenzone/delete-gefahrenzone.handler';
import { GetGefahrenzonenByEinsatzHandler } from '@/application/gefahr/queries/get-gefahrenzonen-by-einsatz/get-gefahrenzonen-by-einsatz.handler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Result } from '@domain/common/result';

const validFeature = {
  type: 'Feature',
  geometry: {
    type: 'Polygon',
    coordinates: [
      [
        [10, 50],
        [10.1, 50],
        [10.1, 50.1],
        [10, 50.1],
        [10, 50],
      ],
    ],
  },
};

const mockUser = { userId: 'user-1', email: 'test@example.com', role: 'ADMIN' };

describe('GefahrenzoneController', () => {
  let controller: GefahrenzoneController;
  let createHandler: jest.Mocked<CreateGefahrenzoneHandler>;
  let updateHandler: jest.Mocked<UpdateGefahrenzoneGeometryHandler>;
  let deleteHandler: jest.Mocked<DeleteGefahrenzoneHandler>;
  let getHandler: jest.Mocked<GetGefahrenzonenByEinsatzHandler>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GefahrenzoneController],
      providers: [
        { provide: CreateGefahrenzoneHandler, useValue: { execute: jest.fn() } },
        { provide: UpdateGefahrenzoneGeometryHandler, useValue: { execute: jest.fn() } },
        { provide: DeleteGefahrenzoneHandler, useValue: { execute: jest.fn() } },
        { provide: GetGefahrenzonenByEinsatzHandler, useValue: { execute: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GefahrenzoneController);
    createHandler = module.get(CreateGefahrenzoneHandler);
    updateHandler = module.get(UpdateGefahrenzoneGeometryHandler);
    deleteHandler = module.get(DeleteGefahrenzoneHandler);
    getHandler = module.get(GetGefahrenzonenByEinsatzHandler);
  });

  describe('list', () => {
    it('gibt Zonen zurück', async () => {
      const expected = { einsatzId: 'e1', zonen: [] };
      getHandler.execute.mockResolvedValue(Result.ok(expected));
      await expect(controller.list('e1')).resolves.toEqual(expected);
    });

    it('wirft BadRequestException bei leerer einsatzId', async () => {
      await expect(controller.list('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('create', () => {
    it('legt eine Zone an', async () => {
      const expected = { id: 'z1', einsatzId: 'e1', warnstufe: null } as any;
      createHandler.execute.mockResolvedValue(Result.ok(expected));
      const result = await controller.create('e1', { gefahrentyp: 'ATEMGIFTE', schutzobjekt: 'MENSCHEN', geometryType: 'POLYGON', geometry: validFeature }, mockUser);
      expect(result).toEqual(expected);
    });

    it('wirft BadRequestException bei ungültigem Gefahrentyp', async () => {
      await expect(controller.create('e1', { gefahrentyp: 'NOPE', schutzobjekt: 'MENSCHEN', geometryType: 'POLYGON', geometry: validFeature }, mockUser)).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateGeometry', () => {
    it('gibt 404 zurück wenn Zone nicht existiert', async () => {
      updateHandler.execute.mockResolvedValue(Result.fail('GEFAHRENZONE_NOT_FOUND'));
      await expect(controller.updateGeometry('e1', 'z-gone', { geometryType: 'POLYGON', geometry: validFeature }, mockUser)).rejects.toThrow(NotFoundException);
    });

    it('updatet erfolgreich', async () => {
      const expected = { id: 'z1' } as any;
      updateHandler.execute.mockResolvedValue(Result.ok(expected));
      const result = await controller.updateGeometry('e1', 'z1', { geometryType: 'POLYGON', geometry: validFeature }, mockUser);
      expect(result).toEqual(expected);
    });
  });

  describe('delete', () => {
    it('gibt 404 zurück wenn Zone nicht existiert', async () => {
      deleteHandler.execute.mockResolvedValue(Result.fail('GEFAHRENZONE_NOT_FOUND'));
      await expect(controller.delete('e1', 'z-gone', mockUser)).rejects.toThrow(NotFoundException);
    });

    it('löscht erfolgreich', async () => {
      deleteHandler.execute.mockResolvedValue(Result.ok(true as any));
      await expect(controller.delete('e1', 'z1', mockUser)).resolves.toBeUndefined();
    });
  });
});
