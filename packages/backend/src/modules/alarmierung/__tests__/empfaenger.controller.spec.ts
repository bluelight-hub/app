import { BadRequestException, ConflictException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Result } from '@domain/common/result';
import type { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { FuegeEmpfaengerHinzuDto } from '@/application/alarmierung/dto';
import { AlarmierungEmpfaengerController } from '../empfaenger.controller';

interface AggregateStubInput {
  id?: string;
  empfaenger?: AlarmierungEmpfaenger[];
}

function aggregateStub(input: AggregateStubInput = {}): AlarmierungAggregate {
  const id = input.id ?? 'alarm-1';
  const fake = {
    id: { value: id },
    alarmierung: {
      id: { value: id },
      einsatzId: { value: 'einsatz-1' },
      bezeichnung: 'Brandschutzgruppe',
      beschreibung: undefined,
      status: 'aktiv' as const,
      alarmierungszeit: new Date('2026-04-15T12:00:00.000Z'),
      ursprungAlarmierungId: undefined,
      createdAt: new Date('2026-04-15T12:00:00.000Z'),
      updatedAt: new Date('2026-04-15T12:00:00.000Z'),
      createdBy: 'user-1',
      updatedBy: 'user-1',
    },
    einsatzId: { value: 'einsatz-1' },
    bezeichnung: 'Brandschutzgruppe',
    istNachalarmierung: false,
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

describe('AlarmierungEmpfaengerController', () => {
  let controller: AlarmierungEmpfaengerController;
  let fuegeHinzuHandler: HandlerMock;
  let entferneHandler: HandlerMock;
  let korrigiereHandler: HandlerMock;
  let getByIdHandler: HandlerMock;

  beforeEach(() => {
    fuegeHinzuHandler = makeHandler();
    entferneHandler = makeHandler();
    korrigiereHandler = makeHandler();
    getByIdHandler = makeHandler();

    controller = new AlarmierungEmpfaengerController(fuegeHinzuHandler as never, entferneHandler as never, korrigiereHandler as never, getByIdHandler as never);
  });

  describe('POST .../empfaenger', () => {
    const dto: FuegeEmpfaengerHinzuDto = {
      kind: 'fahrzeug',
      fahrzeugId: 'fz-1',
      nameSnapshot: 'Florian 12-1',
    };

    it('fügt einen Fahrzeug-Empfänger hinzu', async () => {
      fuegeHinzuHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const result = await controller.hinzufuegen('einsatz-1', 'alarm-1', dto, userStub);
      expect(result.id).toBe('alarm-1');
      const command = fuegeHinzuHandler.execute.mock.calls[0]![0] as {
        alarmierungId: string;
        empfaenger: { kind: string; fahrzeugId: string };
      };
      expect(command.alarmierungId).toBe('alarm-1');
      expect(command.empfaenger).toEqual({ kind: 'fahrzeug', fahrzeugId: 'fz-1' });
    });

    it('fügt einen Person-Empfänger hinzu', async () => {
      fuegeHinzuHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const personDto: FuegeEmpfaengerHinzuDto = {
        kind: 'person',
        personId: 'p-1',
        nameSnapshot: 'Max Mustermann',
      };
      await controller.hinzufuegen('einsatz-1', 'alarm-1', personDto, userStub);
      const command = fuegeHinzuHandler.execute.mock.calls[0]![0] as {
        empfaenger: { kind: string; personId: string };
      };
      expect(command.empfaenger).toEqual({ kind: 'person', personId: 'p-1' });
    });

    it('mappt "bereits zugeordnet" auf 409', async () => {
      fuegeHinzuHandler.execute.mockResolvedValue(Result.fail('Empfänger ist dieser Alarmierung bereits zugeordnet'));
      await expect(controller.hinzufuegen('einsatz-1', 'alarm-1', dto, userStub)).rejects.toThrow(ConflictException);
    });

    it('mappt "Alarmierung nicht gefunden" auf 404', async () => {
      fuegeHinzuHandler.execute.mockResolvedValue(Result.fail('Alarmierung nicht gefunden'));
      await expect(controller.hinzufuegen('einsatz-1', 'alarm-x', dto, userStub)).rejects.toThrow(NotFoundException);
    });

    it('mappt "abgeschlossen"-Invariante auf 422', async () => {
      fuegeHinzuHandler.execute.mockResolvedValue(Result.fail('Abgeschlossene Alarmierung kann keine weiteren Empfänger aufnehmen'));
      await expect(controller.hinzufuegen('einsatz-1', 'alarm-1', dto, userStub)).rejects.toThrow(UnprocessableEntityException);
    });
  });

  describe('DELETE .../empfaenger/:empfaengerId', () => {
    it('entfernt einen Empfänger', async () => {
      entferneHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      await controller.entfernen('einsatz-1', 'alarm-1', 'emp-1', userStub);
      expect(entferneHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('mappt "Empfänger nicht gefunden" auf 404', async () => {
      entferneHandler.execute.mockResolvedValue(Result.fail('Empfänger nicht gefunden'));
      await expect(controller.entfernen('einsatz-1', 'alarm-1', 'emp-x', userStub)).rejects.toThrow(NotFoundException);
    });

    it('mappt "Alarmierung nicht gefunden" auf 404', async () => {
      entferneHandler.execute.mockResolvedValue(Result.fail('Alarmierung nicht gefunden'));
      await expect(controller.entfernen('einsatz-1', 'alarm-x', 'emp-1', userStub)).rejects.toThrow(NotFoundException);
    });
  });

  describe('PATCH .../empfaenger/:empfaengerId/zeitpunkte', () => {
    it('dispatcht pro gesetztem Feld einen Command', async () => {
      korrigiereHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      const body = {
        ausgeruecktAm: '2026-04-15T12:05:00.000Z',
        vorOrtAm: '2026-04-15T12:10:00.000Z',
      };
      const result = await controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-1', body, userStub);
      expect(result.id).toBe('alarm-1');
      expect(korrigiereHandler.execute).toHaveBeenCalledTimes(2);
      const firstCmd = korrigiereHandler.execute.mock.calls[0]![0] as {
        feld: string;
        wert: Date | null;
      };
      expect(firstCmd.feld).toBe('ausgeruecktAm');
      expect(firstCmd.wert).toBeInstanceOf(Date);
    });

    it('erlaubt null, um einen Zeitpunkt zu löschen', async () => {
      korrigiereHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      getByIdHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      await controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-1', { vorOrtAm: null }, userStub);
      const cmd = korrigiereHandler.execute.mock.calls[0]![0] as { wert: Date | null };
      expect(cmd.wert).toBeNull();
    });

    it('wirft 400 wenn kein Feld gesetzt wurde', async () => {
      await expect(controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-1', {}, userStub)).rejects.toThrow(BadRequestException);
    });

    it('wirft 400 bei ungültigem Datum', async () => {
      await expect(controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-1', { vorOrtAm: 'kein-datum' }, userStub)).rejects.toThrow(BadRequestException);
    });

    it('stoppt bei erstem Fehler und propagiert HTTP-Exception', async () => {
      korrigiereHandler.execute.mockResolvedValueOnce(Result.ok(aggregateStub()));
      korrigiereHandler.execute.mockResolvedValueOnce(Result.fail('vorOrtAm darf nicht vor alarmiertAm liegen'));
      const body = {
        ausgeruecktAm: '2026-04-15T12:05:00.000Z',
        vorOrtAm: '2026-04-15T11:50:00.000Z',
      };
      await expect(controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-1', body, userStub)).rejects.toThrow(UnprocessableEntityException);
      expect(korrigiereHandler.execute).toHaveBeenCalledTimes(2);
      expect(getByIdHandler.execute).not.toHaveBeenCalled();
    });

    it('mappt "Empfänger nicht gefunden" auf 404', async () => {
      korrigiereHandler.execute.mockResolvedValue(Result.fail('Empfänger nicht gefunden'));
      await expect(controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-x', { vorOrtAm: '2026-04-15T12:10:00.000Z' }, userStub)).rejects.toThrow(NotFoundException);
    });

    it('wirft 404 wenn die Alarmierung nach Korrektur nicht mehr auffindbar ist', async () => {
      korrigiereHandler.execute.mockResolvedValue(Result.ok(aggregateStub()));
      getByIdHandler.execute.mockResolvedValue(Result.ok(null));
      await expect(controller.korrigiereZeitpunkte('einsatz-1', 'alarm-1', 'emp-1', { vorOrtAm: '2026-04-15T12:10:00.000Z' }, userStub)).rejects.toThrow(NotFoundException);
    });
  });
});
