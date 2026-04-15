// @ts-nocheck
/**
 * Unit-Tests für den FunkkanalEventAdapter (Issue #407).
 *
 * Der Adapter empfängt Funkkanal-Events und ruft `publisher.broadcast(...)`
 * mit dem passenden Channel-Namen und Payload auf. Fehlt der Publisher
 * (Task 18 noch nicht deployed), loggt der Adapter nur.
 */

import { FunkkanalEventAdapter } from '../funkkanal-event.adapter';
import { FunkkanalErstelltEvent } from '@domain/events/funkkanal-erstellt.event';
import { FunkkanalGeaendertEvent } from '@domain/events/funkkanal-geaendert.event';
import { FunkkanalArchiviertEvent } from '@domain/events/funkkanal-archiviert.event';
import { FunkkanalReihenfolgeGeaendertEvent } from '@domain/events/funkkanal-reihenfolge-geaendert.event';
import { FunkkanalZuordnungErstelltEvent } from '@domain/events/funkkanal-zuordnung-erstellt.event';
import { FunkkanalZuordnungEntferntEvent } from '@domain/events/funkkanal-zuordnung-entfernt.event';
import { NotfallAlertRequestedEvent } from '@domain/events/notfall-alert-requested.event';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { FunkkanalZuordnungId } from '@domain/value-objects/funkkanal-zuordnung-id';

const noopLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

describe('FunkkanalEventAdapter', () => {
  let publisher: { broadcast: jest.Mock };
  let adapter: FunkkanalEventAdapter;
  let einsatzId: EinsatzId;
  let funkkanalId: FunkkanalId;
  let zuordnungId: FunkkanalZuordnungId;
  let eintragId: EintragId;

  beforeEach(() => {
    publisher = { broadcast: jest.fn().mockResolvedValue(undefined) };
    adapter = new FunkkanalEventAdapter(noopLogger, publisher);
    einsatzId = EinsatzId.create().value as EinsatzId;
    funkkanalId = FunkkanalId.create().value as FunkkanalId;
    zuordnungId = FunkkanalZuordnungId.create().value as FunkkanalZuordnungId;
    eintragId = EintragId.create().value as EintragId;
  });

  it('erstellt → broadcast "funkkanal:erstellt"', async () => {
    const event = new FunkkanalErstelltEvent(funkkanalId, einsatzId, {
      name: 'Feuer 1',
      details: { type: 'tmo', sprechgruppe: 'SG1' },
      status: 'aktiv',
      sortIndex: 0,
    });
    await adapter.onErstellt(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(einsatzId.value, 'funkkanal:erstellt', expect.objectContaining({ kanalId: funkkanalId.value, name: 'Feuer 1' }));
  });

  it('geaendert → broadcast "funkkanal:geaendert" mit changedFields', async () => {
    const event = new FunkkanalGeaendertEvent(funkkanalId, einsatzId, { name: 'Neu' });
    await adapter.onGeaendert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(einsatzId.value, 'funkkanal:geaendert', expect.objectContaining({ kanalId: funkkanalId.value, changedFields: { name: 'Neu' } }));
  });

  it('archiviert → broadcast "funkkanal:archiviert"', async () => {
    const event = new FunkkanalArchiviertEvent(funkkanalId, einsatzId);
    await adapter.onArchiviert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(einsatzId.value, 'funkkanal:archiviert', expect.objectContaining({ kanalId: funkkanalId.value }));
  });

  it('reihenfolge geaendert → broadcast "funkkanal:reihenfolge-geaendert"', async () => {
    const event = new FunkkanalReihenfolgeGeaendertEvent(einsatzId, [
      { kanalId: 'k1', sortIndex: 0 },
      { kanalId: 'k2', sortIndex: 1 },
    ]);
    await adapter.onReihenfolgeGeaendert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(einsatzId.value, 'funkkanal:reihenfolge-geaendert', expect.objectContaining({ ordering: expect.any(Array) }));
  });

  it('zuordnung erstellt → broadcast "funkkanal:zuordnung-erstellt"', async () => {
    const event = new FunkkanalZuordnungErstelltEvent(funkkanalId, einsatzId, zuordnungId, { kind: 'fahrzeug', fahrzeugId: 'f-1' }, 'Ruf', 'primaer');
    await adapter.onZuordnungErstellt(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(
      einsatzId.value,
      'funkkanal:zuordnung-erstellt',
      expect.objectContaining({ zuordnungId: zuordnungId.value, kraftRef: { kind: 'fahrzeug', fahrzeugId: 'f-1' } }),
    );
  });

  it('zuordnung entfernt → broadcast "funkkanal:zuordnung-entfernt"', async () => {
    const event = new FunkkanalZuordnungEntferntEvent(funkkanalId, einsatzId, zuordnungId);
    await adapter.onZuordnungEntfernt(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(einsatzId.value, 'funkkanal:zuordnung-entfernt', expect.objectContaining({ zuordnungId: zuordnungId.value }));
  });

  it('notfall → broadcast "funk:notfall-alert"', async () => {
    const event = new NotfallAlertRequestedEvent(einsatzId, funkkanalId, eintragId, 'Hilfe', 'Florian 1');
    await adapter.onNotfall(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(einsatzId.value, 'funk:notfall-alert', expect.objectContaining({ kanalId: funkkanalId.value, text: 'Hilfe', absender: 'Florian 1' }));
  });

  it('loggt nur, wenn kein Publisher injiziert ist', async () => {
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const offline = new FunkkanalEventAdapter(loggerMock);
    await offline.onArchiviert(new FunkkanalArchiviertEvent(funkkanalId, einsatzId));
    expect(loggerMock.log).toHaveBeenCalled();
  });

  it('fängt Publisher-Fehler mit Logger.error', async () => {
    publisher.broadcast.mockRejectedValueOnce(new Error('boom'));
    const loggerMock = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
    const faultyAdapter = new FunkkanalEventAdapter(loggerMock, publisher);
    await faultyAdapter.onArchiviert(new FunkkanalArchiviertEvent(funkkanalId, einsatzId));
    expect(loggerMock.error).toHaveBeenCalledWith(expect.stringContaining('boom'), 'FunkkanalEventAdapter');
  });
});
