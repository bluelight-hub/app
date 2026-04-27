/**
 * Unit-Tests für den EigenschutzSicherheitsregelAusgerufenEventAdapter
 * (Story 2.6 AC8).
 *
 * Story-2.6 hält den Adapter bewusst Log-Only; Integration mit WebSocket-
 * Gateway oder Ampel-Projection kommt in Story 2.7 / Epic 6. Wir prüfen
 * hier nur, dass der Adapter:
 *  - auf dem richtigen Event-Namen subscribed (`OnEvent`-Decorator indirekt
 *    via Methode).
 *  - Event-Felder strukturiert loggt.
 *  - PII-Felder (einsatzId, einheitId, userId) über `redactId` hasht.
 *  - Inhalt NICHT loggt (DSGVO-Minimierung, Inhalt lebt im Version-Stream).
 */

import type { ILogger } from '@domain/ports/i-logger.port';
import { SicherheitsregelAusgerufenEvent } from '@domain/eigenschutz/events/sicherheitsregel-ausgerufen.event';
import type { IEinsatzEventPublisher } from '@infrastructure/websocket/events/einsatz-event.types';
import { redactId } from '@/shared/utils/pii-redact.util';
import { EigenschutzSicherheitsregelAusgerufenEventAdapter } from '../sicherheitsregel-ausgerufen.adapter';

const createMockLogger = (): ILogger => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
});

const createMockPublisher = (): IEinsatzEventPublisher => ({
  broadcast: jest.fn().mockResolvedValue(undefined),
  broadcastByEtb: jest.fn().mockResolvedValue(undefined),
});

describe('EigenschutzSicherheitsregelAusgerufenEventAdapter', () => {
  it('loggt Create-Emission mit PII-Redaction und propagationGroupId', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
    const event = new SicherheitsregelAusgerufenEvent(
      'einsatz-abc',
      'user-xyz',
      undefined,
      'regel-1',
      'propgroup-1',
      null,
      1,
      { created: true },
      'Alkoholverbot im Einsatz',
      'Während des gesamten Einsatzes gilt ein striktes Alkoholverbot.',
    );

    await adapter.onSicherheitsregelAusgerufen(event);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [message, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(message).toContain('SicherheitsregelAusgerufenEvent');
    expect(context).toEqual(
      expect.objectContaining({
        eventId: event.eventId,
        einsatzIdHash: redactId('einsatz-abc'),
        einheitIdHash: undefined,
        userIdHash: redactId('user-xyz'),
        sicherheitsregelId: 'regel-1',
        propagationGroupId: 'propgroup-1',
        fromVersion: null,
        toVersion: 1,
        changedFields: { created: true },
        titel: 'Alkoholverbot im Einsatz',
        eventName: SicherheitsregelAusgerufenEvent.eventName(),
      }),
    );
    // Inhalt darf NICHT im Log erscheinen (DSGVO-Minimierung).
    expect(context).not.toHaveProperty('inhalt');
  });

  it('loggt Update-Emission mit updated-Feldliste und beiden Versionen', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
    const event = new SicherheitsregelAusgerufenEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'regel-1', 'propgroup-2', 2, 3, { updated: ['titel', 'inhalt'] }, 'Neuer Titel', 'Neuer Inhalt');

    await adapter.onSicherheitsregelAusgerufen(event);

    expect(logger.log).toHaveBeenCalledTimes(1);
    const [, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context.fromVersion).toBe(2);
    expect(context.toVersion).toBe(3);
    expect(context.changedFields).toEqual({ updated: ['titel', 'inhalt'] });
    expect(context.einheitIdHash).toBe(redactId('einheit-1'));
  });

  it('loggt Deprecate-Emission mit fromVersion===toVersion', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
    const event = new SicherheitsregelAusgerufenEvent('einsatz-abc', 'user-xyz', undefined, 'regel-1', 'propgroup-3', 4, 4, { deprecated: true }, 'Titel', 'Inhalt');

    await adapter.onSicherheitsregelAusgerufen(event);

    const [, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context.fromVersion).toBe(4);
    expect(context.toVersion).toBe(4);
    expect(context.changedFields).toEqual({ deprecated: true });
  });

  it('kürzt überlange Titel auf 80 Zeichen im Log', async () => {
    const logger = createMockLogger();
    const publisher = createMockPublisher();
    const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
    const longTitle = 'A'.repeat(150);
    const event = new SicherheitsregelAusgerufenEvent('einsatz-1', 'user-1', undefined, 'regel-1', 'p', null, 1, { created: true }, longTitle, 'Inhalt');

    await adapter.onSicherheitsregelAusgerufen(event);

    const [, context] = (logger.log as jest.Mock).mock.calls[0];
    expect(context.titel).toHaveLength(80);
  });

  describe('Story 2.7 — WebSocket-Broadcast', () => {
    it('ruft IEinsatzEventPublisher.broadcast mit korrektem Channel und Payload', async () => {
      const logger = createMockLogger();
      const publisher = createMockPublisher();
      const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
      const event = new SicherheitsregelAusgerufenEvent('einsatz-abc', 'user-xyz', 'einheit-1', 'regel-1', 'propgroup-1', 2, 3, { updated: ['titel'] }, 'Neuer Titel', 'Neuer Inhalt');

      await adapter.onSicherheitsregelAusgerufen(event);

      expect(publisher.broadcast).toHaveBeenCalledTimes(1);
      const [einsatzId, channel, payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
      expect(einsatzId).toBe('einsatz-abc');
      expect(channel).toBe('sicherheitsregel:ausgerufen');
      expect(payload).toEqual(
        expect.objectContaining({
          eventId: event.eventId,
          regelId: 'regel-1',
          einsatzId: 'einsatz-abc',
          einheitId: 'einheit-1',
          einsatzweit: false,
          propagationGroupId: 'propgroup-1',
          fromVersion: 2,
          toVersion: 3,
          changedFields: { updated: ['titel'] },
          titel: 'Neuer Titel',
        }),
      );
      expect(payload).not.toHaveProperty('inhalt');
    });

    it('Broadcast mit einsatzweit: true bei einheitId === undefined', async () => {
      const logger = createMockLogger();
      const publisher = createMockPublisher();
      const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
      const event = new SicherheitsregelAusgerufenEvent('einsatz-abc', 'user-xyz', undefined, 'regel-1', 'p', null, 1, { created: true }, 'T', 'I');

      await adapter.onSicherheitsregelAusgerufen(event);

      const [, , payload] = (publisher.broadcast as jest.Mock).mock.calls[0];
      expect(payload.einsatzweit).toBe(true);
      expect(payload.einheitId).toBeNull();
    });

    it('Broadcast-Fehler wird geloggt und NICHT durchgereicht (Resilienz)', async () => {
      const logger = createMockLogger();
      const publisher: IEinsatzEventPublisher = {
        broadcast: jest.fn().mockRejectedValue(new Error('socket disconnected')),
        broadcastByEtb: jest.fn(),
      };
      const adapter = new EigenschutzSicherheitsregelAusgerufenEventAdapter(logger, publisher);
      const event = new SicherheitsregelAusgerufenEvent('einsatz-abc', 'user-xyz', undefined, 'regel-1', 'p', null, 1, { created: true }, 'T', 'I');

      await expect(adapter.onSicherheitsregelAusgerufen(event)).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Broadcast fehlgeschlagen'), expect.any(Object));
    });
  });
});
