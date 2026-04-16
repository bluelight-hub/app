import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type {
  AlarmierungEmpfaengerFahrzeugDto,
  AlarmierungEmpfaengerInputDto,
  CreateAlarmierungDto,
  ErstelleNachalarmierungDto,
  ListAlarmierungenQueryDto,
  SchliesseAlarmierungAbDto,
} from '@/application/alarmierung/dto';
import type { AlarmierungTimelineItem } from '@/application/alarmierung/queries/get-alarmierung-timeline/get-alarmierung-timeline.handler';
import { AlarmierungController } from '../alarmierung.controller';

/**
 * Test-Stubs für das Alarmierungs-Aggregat.
 *
 * Wir nutzen bewusst strukturelles Typing (`as unknown as AlarmierungAggregate`)
 * statt `@ts-nocheck` — der Mapper greift nur auf eine schmale Teilmenge der
 * Aggregat-API zu, deren Shape wir hier minimal reproduzieren.
 */
interface AggregateStubInput {
  id?: string;
  bezeichnung?: string;
  status?: 'aktiv' | 'abgeschlossen';
  ursprungAlarmierungId?: string;
  empfaenger?: AlarmierungEmpfaenger[];
}

function aggregateStub(input: AggregateStubInput = {}): AlarmierungAggregate {
  const id = input.id ?? 'alarm-1';
  const status = input.status ?? 'aktiv';
  const ursprungId = input.ursprungAlarmierungId;
  const fake = {
    id: { value: id },
    alarmierung: {
      id: { value: id },
      einsatzId: { value: 'einsatz-1' },
      bezeichnung: input.bezeichnung ?? 'Brandschutzgruppe',
      beschreibung: undefined,
      status,
      alarmierungszeit: new Date('2026-04-15T12:00:00.000Z'),
      ursprungAlarmierungId: ursprungId ? { value: ursprungId } : undefined,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    },
    einsatzId: { value: 'einsatz-1' },
    bezeichnung: input.bezeichnung ?? 'Brandschutzgruppe',
    istNachalarmierung: !!ursprungId,
    empfaenger: input.empfaenger ?? [],
  };
  return fake as unknown as AlarmierungAggregate;
}

const userStub: ValidatedUser = { userId: 'user-1' } as ValidatedUser;

interface HandlerMock<TArg = unknown, TResult = unknown> {
  execute: jest.Mock<Promise<Result<TResult>>, [TArg]>;
}

function makeHandler<TArg = unknown, TResult = unknown>(): HandlerMock<TArg, TResult> {
  return { execute: jest.fn() as jest.Mock<Promise<Result<TResult>>, [TArg]> };
}

describe('AlarmierungController', () => {
  let controller: AlarmierungController;
  let erstelleHandler: HandlerMock;
  let erstelleNachalarmierungHandler: HandlerMock;
  let schliesseAbHandler: HandlerMock;
  let listHandler: HandlerMock;
  let getByIdHandler: HandlerMock;
  let getTimelineHandler: HandlerMock;

  beforeEach(() => {
    erstelleHandler = makeHandler();
    erstelleNachalarmierungHandler = makeHandler();
    schliesseAbHandler = makeHandler();
    listHandler = makeHandler();
    getByIdHandler = makeHandler();
    getTimelineHandler = makeHandler();

    controller = new AlarmierungController(
      erstelleHandler as never,
      erstelleNachalarmierungHandler as never,
      schliesseAbHandler as never,
      listHandler as never,
      getByIdHandler as never,
      getTimelineHandler as never,
    );
  });

  describe('GET /einsatz/:einsatzId/alarmierungen', () => {
    it('liefert die Liste aller Alarmierungen', async () => {
      listHandler.execute.mockResolvedValue(Result.ok([aggregateStub()]));
      const filter: ListAlarmierungenQueryDto = {};
      const result = await controller.list('einsatz-1', filter);
      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe('alarm-1');
      expect(result[0]!.einsatzId).toBe('einsatz-1');
    });

    it('reicht Filter-Parameter an die Query weiter', async () => {
      listHandler.execute.mockResolvedValue(Result.ok([]));
      const filter: ListAlarmierungenQueryDto = { status: 'abgeschlossen', skip: 10, take: 20 };
      await controller.list('einsatz-1', filter);
      const query = listHandler.execute.mock.calls[0]![0] as {
        einsatzId: string;
        status: string;
        skip: number;
        take: number;
      };
      expect(query.status).toBe('abgeschlossen');
      expect(query.skip).toBe(10);
      expect(query.take).toBe(20);
    });

    it('wirft 400 bei leerer einsatzId', async () => {
      const filter: ListAlarmierungenQueryDto = {};
      await expect(controller.list('', filter)).rejects.toThrow(BadRequestException);
    });
  });

  describe('POST /einsatz/:einsatzId/alarmierungen', () => {
    const fahrzeugEmpfaenger: AlarmierungEmpfaengerFahrzeugDto = {
      kind: 'fahrzeug',
      fahrzeugId: 'fz-1',
      nameSnapshot: 'Florian 12-1',
    };

    it('legt eine Alarmierung an', async () => {
      erstelleHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const dto: CreateAlarmierungDto = {
        bezeichnung: 'Brandschutzgruppe',
        empfaenger: [fahrzeugEmpfaenger],
      };
      const result = await controller.create('einsatz-1', dto, userStub);
      expect(result.id).toBe('alarm-1');
      const command = erstelleHandler.execute.mock.calls[0]![0] as {
        einsatzId: string;
        bezeichnung: string;
        createdBy: string;
        empfaenger: AlarmierungEmpfaengerInputDto[];
      };
      expect(command.einsatzId).toBe('einsatz-1');
      expect(command.createdBy).toBe('user-1');
      expect(command.empfaenger[0]!.kind).toBe('fahrzeug');
    });

    it('mappt "bereits zugeordnet" auf 409', async () => {
      erstelleHandler.execute.mockResolvedValue(Result.fail('Empfänger ist dieser Alarmierung bereits zugeordnet'));
      const dto: CreateAlarmierungDto = {
        bezeichnung: 'Brandschutzgruppe',
        empfaenger: [fahrzeugEmpfaenger],
      };
      await expect(controller.create('einsatz-1', dto, userStub)).rejects.toThrow(ConflictException);
    });

    it('mappt "Mindestens ein Empfänger" auf 400', async () => {
      const dto: CreateAlarmierungDto = {
        bezeichnung: 'Brandschutzgruppe',
        empfaenger: [],
      };
      await expect(controller.create('einsatz-1', dto, userStub)).rejects.toThrow(BadRequestException);
    });

    it('akzeptiert alarmierungszeit als ISO-String', async () => {
      erstelleHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const iso = '2026-04-15T12:30:00.000Z';
      const dto: CreateAlarmierungDto = {
        bezeichnung: 'Brandschutzgruppe',
        alarmierungszeit: iso,
        empfaenger: [fahrzeugEmpfaenger],
      };
      await controller.create('einsatz-1', dto, userStub);
      const command = erstelleHandler.execute.mock.calls[0]![0] as { alarmierungszeit: Date };
      expect(command.alarmierungszeit).toBeInstanceOf(Date);
      expect(command.alarmierungszeit.toISOString()).toBe(iso);
    });
  });

  describe('GET /einsatz/:einsatzId/alarmierungen/timeline', () => {
    it('liefert Timeline-Events chronologisch', async () => {
      const items: AlarmierungTimelineItem[] = [
        {
          type: 'alarmierung_ausgeloest',
          occurredAt: new Date('2026-04-15T12:00:00.000Z'),
          data: { alarmierungId: 'alarm-1', bezeichnung: 'Brandschutzgruppe' },
        },
      ];
      getTimelineHandler.execute.mockResolvedValue(Result.ok(items));
      const result = await controller.timeline('einsatz-1');
      expect(result).toHaveLength(1);
      expect(result[0]!.type).toBe('alarmierung_ausgeloest');
      expect(result[0]!.data.bezeichnung).toBe('Brandschutzgruppe');
    });

    it('wirft 400 bei leerer einsatzId', async () => {
      await expect(controller.timeline('')).rejects.toThrow(BadRequestException);
    });
  });

  describe('GET /einsatz/:einsatzId/alarmierungen/:alarmierungId', () => {
    it('liefert eine einzelne Alarmierung', async () => {
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const result = await controller.getById('einsatz-1', 'alarm-1');
      expect(result.id).toBe('alarm-1');
    });

    it('wirft 404 wenn die Alarmierung nicht existiert', async () => {
      getByIdHandler.execute.mockResolvedValue(Result.ok(null));
      await expect(controller.getById('einsatz-1', 'alarm-x')).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /einsatz/:einsatzId/alarmierungen/:alarmierungId/abschliessen', () => {
    it('schließt eine Alarmierung ab', async () => {
      schliesseAbHandler.execute.mockResolvedValue(Result.ok(aggregateStub({ status: 'abgeschlossen' })));
      const dto: SchliesseAlarmierungAbDto = {};
      const result = await controller.abschliessen('einsatz-1', 'alarm-1', dto, userStub);
      expect(result.status).toBe('abgeschlossen');
      expect(schliesseAbHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('mappt "bereits abgeschlossen" auf 409', async () => {
      schliesseAbHandler.execute.mockResolvedValue(Result.fail('Alarmierung ist bereits abgeschlossen'));
      const dto: SchliesseAlarmierungAbDto = {};
      await expect(controller.abschliessen('einsatz-1', 'alarm-1', dto, userStub)).rejects.toThrow(ConflictException);
    });

    it('mappt "Alarmierung nicht gefunden" auf 404', async () => {
      schliesseAbHandler.execute.mockResolvedValue(Result.fail('Alarmierung nicht gefunden'));
      const dto: SchliesseAlarmierungAbDto = {};
      await expect(controller.abschliessen('einsatz-1', 'alarm-x', dto, userStub)).rejects.toThrow(NotFoundException);
    });
  });

  describe('POST /einsatz/:einsatzId/alarmierungen/:alarmierungId/nachalarmierung', () => {
    const fahrzeugEmpfaenger: AlarmierungEmpfaengerFahrzeugDto = {
      kind: 'fahrzeug',
      fahrzeugId: 'fz-2',
      nameSnapshot: 'Florian 12-2',
    };

    it('legt eine Nachalarmierung an', async () => {
      erstelleNachalarmierungHandler.execute.mockResolvedValue(Result.ok(aggregateStub({ id: 'alarm-2', ursprungAlarmierungId: 'alarm-1' })));
      const dto: ErstelleNachalarmierungDto = {
        bezeichnung: 'Nachalarmierung',
        empfaenger: [fahrzeugEmpfaenger],
      };
      const result = await controller.erstelleNachalarmierung('einsatz-1', 'alarm-1', dto, userStub);
      expect(result.id).toBe('alarm-2');
      expect(result.ursprungAlarmierungId).toBe('alarm-1');
      expect(result.istNachalarmierung).toBe(true);
      const command = erstelleNachalarmierungHandler.execute.mock.calls[0]![0] as {
        ursprungAlarmierungId: string;
      };
      expect(command.ursprungAlarmierungId).toBe('alarm-1');
    });

    it('mappt "gehört nicht zum Einsatz" auf 422', async () => {
      erstelleNachalarmierungHandler.execute.mockResolvedValue(Result.fail('Ursprungs-Alarmierung gehört nicht zum angegebenen Einsatz'));
      const dto: ErstelleNachalarmierungDto = {
        bezeichnung: 'Nachalarmierung',
        empfaenger: [fahrzeugEmpfaenger],
      };
      await expect(controller.erstelleNachalarmierung('einsatz-1', 'alarm-x', dto, userStub)).rejects.toThrow(UnprocessableEntityException);
    });

    it('mappt "Ursprungs-Alarmierung nicht gefunden" auf 404', async () => {
      erstelleNachalarmierungHandler.execute.mockResolvedValue(Result.fail('Ursprungs-Alarmierung nicht gefunden'));
      const dto: ErstelleNachalarmierungDto = {
        bezeichnung: 'Nachalarmierung',
        empfaenger: [fahrzeugEmpfaenger],
      };
      await expect(controller.erstelleNachalarmierung('einsatz-1', 'alarm-x', dto, userStub)).rejects.toThrow(NotFoundException);
    });
  });
});
