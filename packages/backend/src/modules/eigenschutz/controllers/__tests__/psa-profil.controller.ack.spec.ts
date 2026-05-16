/**
 * Tests für die Story-3.4-Endpoints im `PsaProfilController`:
 * - `POST propagation-groups/:propagationGroupId/quittieren` (AC7)
 * - `GET propagation-groups/:propagationGroupId/quittungen` (AC8)
 * - `GET propagation-groups/offene-bekanntgaben?seit=<ISO>` (AC15)
 *
 * Pattern: `psa-profil.controller.spec.ts` (Story 3.1) — Guards überschrieben,
 * CommandBus/QueryBus gemockt, Sentinel-Mapping verifiziert.
 */

import { InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { AckPsaQuittungCommand } from '@/application/eigenschutz/commands/ack-psa-quittung/ack-psa-quittung.command';
import { ACK_PSA_QUITTUNG_ERROR_CODES } from '@/application/eigenschutz/commands/ack-psa-quittung/ack-psa-quittung.handler';
import { ListOffenePsaBekanntgabenQuery } from '@/application/eigenschutz/queries/list-offene-psa-bekanntgaben/list-offene-psa-bekanntgaben.query';
import { ListPsaQuittungenQuery } from '@/application/eigenschutz/queries/list-psa-quittungen/list-psa-quittungen.query';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { LOGGER } from '@infrastructure/di-tokens';
import { PsaProfilController } from '../psa-profil.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyuipgrp01';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

describe('PsaProfilController — Story 3.4 (Quittung + Sender-View)', () => {
  let controller: PsaProfilController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PsaProfilController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PsaProfilController);
  });

  describe('POST propagation-groups/:propagationGroupId/quittieren', () => {
    function callQuittieren() {
      return controller.quittieren(EINSATZ_ID, PROPAGATION_GROUP_ID, { einheitId: EINHEIT_ID }, { userId: USER_ID } as never);
    }

    it('204 (void) bei Erfolg — Command erhält propagationGroupId aus Pfad und einheitId aus Body', async () => {
      commandBus.execute.mockResolvedValue(Result.ok({ alreadyAcknowledged: false }));

      await expect(callQuittieren()).resolves.toBeUndefined();

      const command = commandBus.execute.mock.calls[0][0];
      expect(command).toBeInstanceOf(AckPsaQuittungCommand);
      expect(command.einsatzId).toBe(EINSATZ_ID);
      expect(command.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
      expect(command.einheitId).toBe(EINHEIT_ID);
      expect(command.callerUserId).toBe(USER_ID);
    });

    it('204 (void) auch bei idempotentem Re-Ack (alreadyAcknowledged=true)', async () => {
      commandBus.execute.mockResolvedValue(Result.ok({ alreadyAcknowledged: true }));

      await expect(callQuittieren()).resolves.toBeUndefined();
    });

    it('422 UnprocessableEntity bei UnzulaessigeEinheitenZuordnung', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(ACK_PSA_QUITTUNG_ERROR_CODES.UNZULAESSIGE_EINHEITENZUORDNUNG));

      await expect(callQuittieren()).rejects.toBeInstanceOf(UnprocessableEntityException);
      try {
        await callQuittieren();
      } catch (e) {
        const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(response.context.rule).toBe('UnzulaessigeEinheitenZuordnung');
      }
    });

    it('404 NotFoundException bei NotFound:PsaPropagation', async () => {
      commandBus.execute.mockResolvedValue(Result.fail(ACK_PSA_QUITTUNG_ERROR_CODES.NOT_FOUND_PROPAGATION));

      await expect(callQuittieren()).rejects.toBeInstanceOf(NotFoundException);
      try {
        await callQuittieren();
      } catch (e) {
        const response = (e as NotFoundException).getResponse() as { context: { resource: string } };
        expect(response.context.resource).toBe('psapropagation');
      }
    });

    it('500 InternalServerError bei InfrastructureError-Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:db-down'));

      await expect(callQuittieren()).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('500 InternalServerError bei unbekanntem Sentinel', async () => {
      commandBus.execute.mockResolvedValue(Result.fail('boom'));

      await expect(callQuittieren()).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('GET propagation-groups/:propagationGroupId/quittungen', () => {
    it('reicht die Query-Antwort durch und baut die Query-Instanz korrekt', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([{ einheitId: EINHEIT_ID, einheitName: '1. Sangruppe', status: 'AUSSTEHEND' }]));

      const result = await controller.listQuittungen(EINSATZ_ID, PROPAGATION_GROUP_ID);

      const query = queryBus.execute.mock.calls[0][0];
      expect(query).toBeInstanceOf(ListPsaQuittungenQuery);
      expect(query.einsatzId).toBe(EINSATZ_ID);
      expect(query.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ einheitId: EINHEIT_ID, status: 'AUSSTEHEND' });
    });

    it('500 InternalServerError bei InfrastructureError-Sentinel aus dem Query-Handler', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:db-down'));

      await expect(controller.listQuittungen(EINSATZ_ID, PROPAGATION_GROUP_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('GET propagation-groups/offene-bekanntgaben', () => {
    it('reicht den optionalen `seit`-Query-Parameter unverändert an die Query weiter', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([]));
      const seit = '2026-04-27T00:00:00.000Z';

      await controller.listOffeneBekanntgaben(EINSATZ_ID, seit);

      const query = queryBus.execute.mock.calls[0][0];
      expect(query).toBeInstanceOf(ListOffenePsaBekanntgabenQuery);
      expect(query.einsatzId).toBe(EINSATZ_ID);
      expect(query.seitISO).toBe(seit);
    });

    it('übergibt `undefined` an die Query, wenn `seit` als leerer String kommt (Default 24h greift im Handler)', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([]));

      await controller.listOffeneBekanntgaben(EINSATZ_ID, '');

      const query = queryBus.execute.mock.calls[0][0];
      expect(query.seitISO).toBeUndefined();
    });

    it('übergibt `undefined`, wenn `seit` ganz fehlt', async () => {
      queryBus.execute.mockResolvedValue(Result.ok([]));

      await controller.listOffeneBekanntgaben(EINSATZ_ID);

      const query = queryBus.execute.mock.calls[0][0];
      expect(query.seitISO).toBeUndefined();
    });

    it('reicht die Liste unverändert durch', async () => {
      const sample = [
        {
          propagationGroupId: PROPAGATION_GROUP_ID,
          occurredAt: '2026-04-27T08:39:11.000Z',
          begruendungAnriss: 'CBRN-Lage',
          profilToggles: [{ profil: 'BASIS', aktion: 'AKTIVIERT' }],
          betroffeneEinheitIds: [EINHEIT_ID],
          ackCount: 0,
          totalCount: 1,
          status: 'pending',
        },
      ];
      queryBus.execute.mockResolvedValue(Result.ok(sample));

      const result = await controller.listOffeneBekanntgaben(EINSATZ_ID);

      expect(result).toEqual(sample);
    });

    it('500 InternalServerError bei InfrastructureError-Sentinel', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:PsaProfilQuittung:db-down'));

      await expect(controller.listOffeneBekanntgaben(EINSATZ_ID)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });
});
