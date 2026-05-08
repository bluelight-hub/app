import { Result } from '@domain/common/result';
import type { IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { RebuildAmpelProjectionCommand } from '../rebuild-ampel-projection.command';
import { RebuildAmpelProjectionHandler } from '../rebuild-ampel-projection.handler';

const EINSATZ_ID = 'einsatz-1';
const LETZTE_AENDERUNG_AM = new Date('2026-05-07T12:00:00.000Z');

const createEinheit = (id: string) => ({ id: { value: id } });

const createEinheitenRepo = (result = Result.ok([createEinheit('einheit-a'), createEinheit('einheit-b')])) =>
  ({
    findByEinsatzId: jest.fn().mockResolvedValue(result),
  }) as unknown as jest.Mocked<IEinsatzEinheitRepository>;

const createProjectionRepo = (recalculateResult = Result.ok({})) =>
  ({
    upsert: jest.fn(),
    findByEinsatz: jest.fn(),
    recalculateForEinheit: jest.fn().mockResolvedValue(recalculateResult),
  }) as unknown as jest.Mocked<IAmpelProjectionRepository>;

describe('RebuildAmpelProjectionHandler', () => {
  it('recomputet alle Einsatz-Einheiten', async () => {
    const einheitenRepo = createEinheitenRepo();
    const projectionRepo = createProjectionRepo();
    const handler = new RebuildAmpelProjectionHandler(einheitenRepo, projectionRepo);

    const result = await handler.execute(new RebuildAmpelProjectionCommand(EINSATZ_ID, LETZTE_AENDERUNG_AM));

    expect(result.isSuccess).toBe(true);
    expect(result.value).toEqual({ recalculated: 2 });
    expect(einheitenRepo.findByEinsatzId).toHaveBeenCalledWith(EINSATZ_ID);
    expect(projectionRepo.recalculateForEinheit).toHaveBeenNthCalledWith(1, {
      einsatzId: EINSATZ_ID,
      einheitId: 'einheit-a',
      letzteAenderungAm: LETZTE_AENDERUNG_AM,
      letzteAenderungVonUserId: null,
    });
    expect(projectionRepo.recalculateForEinheit).toHaveBeenNthCalledWith(2, {
      einsatzId: EINSATZ_ID,
      einheitId: 'einheit-b',
      letzteAenderungAm: LETZTE_AENDERUNG_AM,
      letzteAenderungVonUserId: null,
    });
  });

  it('kann mit nur einer Einsatz-ID konstruiert werden', async () => {
    jest.useFakeTimers().setSystemTime(LETZTE_AENDERUNG_AM);
    const einheitenRepo = createEinheitenRepo(Result.ok([createEinheit('einheit-a')]));
    const projectionRepo = createProjectionRepo();
    const handler = new RebuildAmpelProjectionHandler(einheitenRepo, projectionRepo);

    try {
      const result = await handler.execute(new RebuildAmpelProjectionCommand(EINSATZ_ID));

      expect(result.isSuccess).toBe(true);
      expect(projectionRepo.recalculateForEinheit).toHaveBeenCalledWith({
        einsatzId: EINSATZ_ID,
        einheitId: 'einheit-a',
        letzteAenderungAm: LETZTE_AENDERUNG_AM,
        letzteAenderungVonUserId: null,
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it('nutzt keinen Delete-Wipe- oder Upsert-Pfad', async () => {
    const einheitenRepo = createEinheitenRepo(Result.ok([createEinheit('einheit-a')]));
    const projectionRepo = createProjectionRepo();
    const handler = new RebuildAmpelProjectionHandler(einheitenRepo, projectionRepo);

    await handler.execute(new RebuildAmpelProjectionCommand(EINSATZ_ID, LETZTE_AENDERUNG_AM));

    expect(projectionRepo.recalculateForEinheit).toHaveBeenCalledTimes(1);
    expect(projectionRepo.upsert).not.toHaveBeenCalled();
    expect(projectionRepo.findByEinsatz).not.toHaveBeenCalled();
  });

  it('gibt Fehler vom Einheiten-Repository als Result.fail zurück', async () => {
    const einheitenRepo = createEinheitenRepo(Result.fail('InfrastructureError:Einheiten:db-down'));
    const projectionRepo = createProjectionRepo();
    const handler = new RebuildAmpelProjectionHandler(einheitenRepo, projectionRepo);

    const result = await handler.execute(new RebuildAmpelProjectionCommand(EINSATZ_ID, LETZTE_AENDERUNG_AM));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:Einheiten:db-down');
    expect(projectionRepo.recalculateForEinheit).not.toHaveBeenCalled();
  });

  it('gibt Recompute-Fehler als Result.fail zurück', async () => {
    const einheitenRepo = createEinheitenRepo(Result.ok([createEinheit('einheit-a')]));
    const projectionRepo = createProjectionRepo(Result.fail('InfrastructureError:AmpelProjection:db-down'));
    const handler = new RebuildAmpelProjectionHandler(einheitenRepo, projectionRepo);

    const result = await handler.execute(new RebuildAmpelProjectionCommand(EINSATZ_ID, LETZTE_AENDERUNG_AM));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:AmpelProjection:db-down');
  });

  it('gibt geworfene Recompute-Fehler als Result.fail zurück', async () => {
    const einheitenRepo = createEinheitenRepo(Result.ok([createEinheit('einheit-a')]));
    const projectionRepo = createProjectionRepo();
    projectionRepo.recalculateForEinheit.mockRejectedValue(new Error('db-timeout'));
    const handler = new RebuildAmpelProjectionHandler(einheitenRepo, projectionRepo);

    const result = await handler.execute(new RebuildAmpelProjectionCommand(EINSATZ_ID, LETZTE_AENDERUNG_AM));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('InfrastructureError:AmpelProjectionRebuild:db-timeout');
  });
});
