// @ts-nocheck
/**
 * Unit-Tests für den EtbFunkspruchBroadcastAdapter (Issue #407).
 */

import { EtbFunkspruchBroadcastAdapter } from '../etb-funkspruch-broadcast-event.adapter';
import { EintragAddedEvent } from '@domain/events/eintrag-added.event';
import { EintragKorrigiertEvent } from '@domain/events/eintrag-korrigiert.event';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { EtbId } from '@domain/value-objects/etb-id';
import { UserId } from '@domain/value-objects/user-id';

const loggerMock = () => ({ log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() });

describe('EtbFunkspruchBroadcastAdapter', () => {
  let publisher: { broadcast: jest.Mock };
  let etbId: EtbId;
  let eintragId: EintragId;
  let userId: UserId;

  beforeEach(() => {
    publisher = { broadcast: jest.fn().mockResolvedValue(undefined) };
    etbId = EtbId.create().value as EtbId;
    eintragId = EintragId.create().value as EintragId;
    userId = UserId.create().value as UserId;
  });

  it('ignoriert Standard-Einträge', async () => {
    const adapter = new EtbFunkspruchBroadcastAdapter(loggerMock(), publisher);
    const event = new EintragAddedEvent(etbId, eintragId, 1, 'text', userId, { type: 'standard' });
    await adapter.onEintragAdded(event);
    expect(publisher.broadcast).not.toHaveBeenCalled();
  });

  it('broadcastet Funksprüche mit kanalId + funkPrioritaet', async () => {
    const adapter = new EtbFunkspruchBroadcastAdapter(loggerMock(), publisher);
    const event = new EintragAddedEvent(
      etbId,
      eintragId,
      2,
      'Funkspruch-Text',
      userId,
      { type: 'funkspruch', kanalId: 'k1', richtung: 'eingehend', funkPrioritaet: 'normal' },
      undefined,
      'Florian 1',
      'Leitstelle',
    );
    await adapter.onEintragAdded(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(
      etbId.value,
      'etb:eintrag-erstellt',
      expect.objectContaining({
        eintragId: eintragId.value,
        text: 'Funkspruch-Text',
        absender: 'Florian 1',
      }),
    );
  });

  it('broadcastet Korrektur-Events unabhängig vom Kontext', async () => {
    const adapter = new EtbFunkspruchBroadcastAdapter(loggerMock(), publisher);
    const korrekturId = EintragId.create().value as EintragId;
    const event = new EintragKorrigiertEvent(etbId, korrekturId, eintragId, 2, 'Korrektur', userId);
    await adapter.onEintragKorrigiert(event);
    expect(publisher.broadcast).toHaveBeenCalledWith(etbId.value, 'etb:eintrag-korrigiert', expect.objectContaining({ korrekturEintragId: korrekturId.value, originalEintragId: eintragId.value }));
  });

  it('loggt nur, wenn kein Publisher verfügbar', async () => {
    const logger = loggerMock();
    const adapter = new EtbFunkspruchBroadcastAdapter(logger);
    const event = new EintragAddedEvent(etbId, eintragId, 1, 'x', userId, { type: 'funkspruch', kanalId: 'k1', richtung: 'ausgehend', funkPrioritaet: 'normal' });
    await adapter.onEintragAdded(event);
    expect(logger.log).toHaveBeenCalled();
  });
});
