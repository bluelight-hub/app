// @ts-nocheck
import { Test } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { GefahrenmatrixController } from '../gefahrenmatrix.controller';
import { GetGefahrenmatrixHandler } from '@/application/gefahr/queries/get-gefahrenmatrix/get-gefahrenmatrix.handler';
import { UpdateGefahrenmatrixHandler } from '@/application/gefahr/commands/update-gefahrenmatrix/update-gefahrenmatrix.handler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Result } from '@domain/common/result';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';

describe('GefahrenmatrixController', () => {
  let controller: GefahrenmatrixController;
  let getHandler: jest.Mocked<GetGefahrenmatrixHandler>;
  let updateHandler: jest.Mocked<UpdateGefahrenmatrixHandler>;

  const mockUser: ValidatedUser = {
    userId: 'test-user-id-12345678',
    email: 'test@example.com',
    role: 'ADMIN',
  } as ValidatedUser;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [GefahrenmatrixController],
      providers: [
        {
          provide: GetGefahrenmatrixHandler,
          useValue: { execute: jest.fn() },
        },
        {
          provide: UpdateGefahrenmatrixHandler,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(GefahrenmatrixController);
    getHandler = module.get(GetGefahrenmatrixHandler);
    updateHandler = module.get(UpdateGefahrenmatrixHandler);
  });

  describe('get', () => {
    it('gibt Gefahrenmatrix zurück', async () => {
      const expected = { einsatzId: 'test-123', bewertungen: [] };
      getHandler.execute.mockResolvedValue(Result.ok(expected));

      const result = await controller.get('test-123');

      expect(result).toEqual(expected);
    });

    it('wirft BadRequestException bei leerem einsatzId', async () => {
      await expect(controller.get('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateBewertung', () => {
    it('aktualisiert eine Bewertung', async () => {
      const expected = {
        id: 'bewertung-1',
        gefahrentyp: 'ATEMGIFTE',
        schutzobjekt: 'MENSCHEN',
        warnstufe: 'HOCH',
        beschreibung: null,
        gemeldetVon: null,
        updatedAt: new Date(),
      };
      updateHandler.execute.mockResolvedValue(Result.ok(expected));

      const result = await controller.updateBewertung('test-123', { gefahrentyp: 'ATEMGIFTE', schutzobjekt: 'MENSCHEN', warnstufe: 'HOCH' }, mockUser);

      expect(result).toEqual(expected);
    });

    it('wirft BadRequestException bei ungültigem Gefahrentyp', async () => {
      await expect(controller.updateBewertung('test-123', { gefahrentyp: 'INVALID', schutzobjekt: 'MENSCHEN', warnstufe: 'HOCH' }, mockUser)).rejects.toThrow(BadRequestException);
    });
  });
});
