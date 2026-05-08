import 'reflect-metadata';
import type { ILogger } from '@domain/ports/i-logger.port';
import { Result } from '@domain/common/result';
import type { IAmpelProjectionRepository } from '@domain/eigenschutz/repositories';
import type { IEinsatzEinheitRepository } from '@domain/kraefte/repositories/i-einsatz-einheit.repository';
import { GefaehrdungsbeurteilungAktualisiertEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-aktualisiert.event';
import { GefaehrdungsbeurteilungErstelltEvent } from '@domain/eigenschutz/events/gefaehrdungsbeurteilung-erstellt.event';
import { LueckeGemeldetEvent } from '@domain/eigenschutz/events/luecke-gemeldet.event';
import { PsaProfilGeaendertEvent } from '@domain/eigenschutz/events/psa-profil-geaendert.event';
import { QuittungAbgegebenEvent } from '@domain/eigenschutz/events/quittung-abgegeben.event';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import { SicherheitsregelQuittiertEvent } from '@domain/eigenschutz/events/sicherheitsregel-quittiert.event';
import { VorfallGemeldetEvent } from '@domain/eigenschutz/events/vorfall-gemeldet.event';
import { RecalculateAmpelProjectionOnEigenschutzEventHandler } from '../recalculate-ampel-projection.handler';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui06101';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui06102';
const USER_ID = 'clw3h8x9y0000qwertyui06103';
const OCCURRED_ON = new Date('2026-05-07T11:00:00.000Z');

const createLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const createProjection = (recalculateForEinheit = jest.fn().mockResolvedValue(Result.ok({}))) =>
  ({
    upsert: jest.fn(),
    findByEinsatz: jest.fn(),
    recalculateForEinheit,
  }) as IAmpelProjectionRepository;

const createEinheitenRepo = (ids: string[] = []) =>
  ({
    findByEinsatzId: jest.fn().mockResolvedValue(Result.ok(ids.map((id) => ({ id: { value: id } })))),
  }) as unknown as IEinsatzEinheitRepository;

describe('RecalculateAmpelProjectionOnEigenschutzEventHandler', () => {
  it.each([
    ['GefaehrdungsbeurteilungErstelltEvent', () => new GefaehrdungsbeurteilungErstelltEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'gef-1', null, 1, undefined, OCCURRED_ON)],
    [
      'GefaehrdungsbeurteilungAktualisiertEvent',
      () => new GefaehrdungsbeurteilungAktualisiertEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'gef-1', 1, 2, { added: [], removed: [], updated: [], unchanged: 1 }, undefined, OCCURRED_ON),
    ],
    ['PsaProfilGeaendertEvent', () => new PsaProfilGeaendertEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'zuw-1', 'group-1', 'BASIS', 'AKTIVIERT', 'Test', undefined, OCCURRED_ON)],
    ['QuittungAbgegebenEvent', () => new QuittungAbgegebenEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'group-1', OCCURRED_ON, undefined, OCCURRED_ON)],
    ['LueckeGemeldetEvent', () => new LueckeGemeldetEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'group-1', 'Maske fehlt', OCCURRED_ON, undefined, OCCURRED_ON)],
    ['SicherheitsregelQuittiertEvent', () => new SicherheitsregelQuittiertEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'regel-1', 'regel-group-1', OCCURRED_ON, undefined, OCCURRED_ON)],
    ['VorfallGemeldetEvent', () => new VorfallGemeldetEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'vorfall-1', OCCURRED_ON, true, undefined, OCCURRED_ON)],
  ])('recomputet die betroffene Einheit für %s', async (_name, makeEvent) => {
    const recalculateForEinheit = jest.fn().mockResolvedValue(Result.ok({}));
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), createProjection(recalculateForEinheit), createEinheitenRepo());

    await handler.handle(makeEvent());

    expect(recalculateForEinheit).toHaveBeenCalledWith({
      einsatzId: EINSATZ_ID,
      einheitId: EINHEIT_ID,
      letzteAenderungAm: OCCURRED_ON,
      letzteAenderungVonUserId: USER_ID,
    });
  });

  it('recomputet alle Einsatz-Einheiten bei einsatzweiter Sicherheitsregel', async () => {
    const recalculateForEinheit = jest.fn().mockResolvedValue(Result.ok({}));
    const einheitenRepo = createEinheitenRepo(['einheit-a', 'einheit-b']);
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), createProjection(recalculateForEinheit), einheitenRepo);

    await handler.handle(new SicherheitsregelAusgerufenEvent(EINSATZ_ID, USER_ID, undefined, 'regel-1', 'regel-group-1', null, 1, { created: true }, 'Titel', 'Inhalt', undefined, OCCURRED_ON));

    expect(einheitenRepo.findByEinsatzId).toHaveBeenCalledWith(EINSATZ_ID);
    expect(recalculateForEinheit).toHaveBeenCalledTimes(2);
    expect(recalculateForEinheit).toHaveBeenNthCalledWith(1, { einsatzId: EINSATZ_ID, einheitId: 'einheit-a', letzteAenderungAm: OCCURRED_ON, letzteAenderungVonUserId: USER_ID });
    expect(recalculateForEinheit).toHaveBeenNthCalledWith(2, { einsatzId: EINSATZ_ID, einheitId: 'einheit-b', letzteAenderungAm: OCCURRED_ON, letzteAenderungVonUserId: USER_ID });
  });

  it('ignoriert QuittungUeberfaelligEvent ohne künstliche letzteAenderungAm-Änderung', async () => {
    const recalculateForEinheit = jest.fn();
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), createProjection(recalculateForEinheit), createEinheitenRepo());

    await handler.handle(new QuittungUeberfaelligEvent(EINSATZ_ID, EINHEIT_ID, 'group-1', 'event-1', 5, 'zuw-1', undefined, OCCURRED_ON));

    expect(recalculateForEinheit).not.toHaveBeenCalled();
  });

  it('loggt Recompute-Fehler und wirft für Outbox-Retry', async () => {
    const logger = createLogger();
    const recalculateForEinheit = jest.fn().mockResolvedValue(Result.fail('InfrastructureError:AmpelProjection:db-down'));
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(logger, createProjection(recalculateForEinheit), createEinheitenRepo());

    await expect(handler.handle(new PsaProfilGeaendertEvent(EINSATZ_ID, USER_ID, EINHEIT_ID, 'zuw-1', 'group-1', 'BASIS', 'AKTIVIERT', 'Test'))).rejects.toThrow(
      'InfrastructureError:AmpelProjection:db-down',
    );

    expect(logger.error).toHaveBeenCalledWith('AmpelProjection-Recompute fehlgeschlagen', expect.objectContaining({ error: 'InfrastructureError:AmpelProjection:db-down' }));
    expect(logger.error).toHaveBeenCalledWith('AmpelProjection-Recompute hat geworfen', expect.objectContaining({ error: 'InfrastructureError:AmpelProjection:db-down' }));
  });

  it('loggt fehlendes Einheiten-Load und wirft für Outbox-Retry', async () => {
    const logger = createLogger();
    const einheitenRepo = {
      findByEinsatzId: jest.fn().mockResolvedValue(Result.fail('InfrastructureError:Einheiten:db-down')),
    } as unknown as IEinsatzEinheitRepository;
    const recalculateForEinheit = jest.fn();
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(logger, createProjection(recalculateForEinheit), einheitenRepo);

    await expect(handler.handle(new SicherheitsregelAusgerufenEvent(EINSATZ_ID, USER_ID, undefined, 'regel-1', 'regel-group-1', null, 1, { created: true }, 'Titel', 'Inhalt'))).rejects.toThrow(
      'InfrastructureError:Einheiten:db-down',
    );

    expect(recalculateForEinheit).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith('AmpelProjection-Recompute: Einsatz-Einheiten konnten nicht geladen werden', expect.objectContaining({ error: 'InfrastructureError:Einheiten:db-down' }));
  });

  it('@OnEvent-Reflection: registriert genau die Story-6.1-Event-Matrix', () => {
    const handler = new RecalculateAmpelProjectionOnEigenschutzEventHandler(createLogger(), createProjection(), createEinheitenRepo());
    const proto = Object.getPrototypeOf(handler);
    const listeners = Object.getOwnPropertyNames(proto)
      .filter((name) => name !== 'constructor' && typeof proto[name] === 'function')
      .flatMap((name) => {
        const meta = Reflect.getMetadata('EVENT_LISTENER_METADATA', proto[name]);
        const list = Array.isArray(meta) ? meta : meta ? [meta] : [];
        return list.map((m) => m.event);
      });

    expect(listeners).toEqual([
      GefaehrdungsbeurteilungErstelltEvent.eventName(),
      GefaehrdungsbeurteilungAktualisiertEvent.eventName(),
      PsaProfilGeaendertEvent.eventName(),
      QuittungAbgegebenEvent.eventName(),
      LueckeGemeldetEvent.eventName(),
      SicherheitsregelAusgerufenEvent.eventName(),
      SicherheitsregelQuittiertEvent.eventName(),
      QuittungUeberfaelligEvent.eventName(),
      VorfallGemeldetEvent.eventName(),
    ]);
  });
});
