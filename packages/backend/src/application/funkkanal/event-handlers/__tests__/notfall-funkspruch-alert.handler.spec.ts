// @ts-nocheck
import { Test, type TestingModule } from '@nestjs/testing';
import { NotfallFunkspruchAlertHandler } from '../notfall-funkspruch-alert.handler';
import { EintragAddedEvent } from '@domain/events/eintrag-added.event';
import { NotfallAlertRequestedEvent } from '@domain/events/notfall-alert-requested.event';
import { EtbId } from '@domain/value-objects/etb-id';
import { EintragId } from '@domain/value-objects/eintrag-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { FunkkanalId } from '@domain/value-objects/funkkanal-id';
import { UserId } from '@domain/value-objects/user-id';
import { ETB_REPOSITORY, EVENT_PUBLISHER, LOGGER } from '@infrastructure/di-tokens';

describe('NotfallFunkspruchAlertHandler', () => {
  let handler: NotfallFunkspruchAlertHandler;
  let mockEventPublisher: { publish: jest.Mock };
  let mockEtbRepo: { findById: jest.Mock };
  let mockLogger: { log: jest.Mock; warn: jest.Mock; error: jest.Mock; debug: jest.Mock };

  const etbId = EtbId.create(EtbId.create().value?.value).value!;
  const eintragId = EintragId.create().value!;
  const userId = UserId.create().value!;
  const einsatzId = EinsatzId.create().value!;
  const kanalId = FunkkanalId.create().value!;

  function makeEvent(kontext: any, opts?: { absender?: string }): EintragAddedEvent {
    return new EintragAddedEvent(etbId, eintragId, 1, 'Brand 12', userId, kontext, undefined, opts?.absender);
  }

  beforeEach(async () => {
    jest.clearAllMocks();
    mockEventPublisher = { publish: jest.fn().mockResolvedValue(undefined) };
    mockEtbRepo = { findById: jest.fn() };
    mockLogger = { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotfallFunkspruchAlertHandler,
        { provide: EVENT_PUBLISHER, useValue: mockEventPublisher },
        { provide: ETB_REPOSITORY, useValue: mockEtbRepo },
        { provide: LOGGER, useValue: mockLogger },
      ],
    }).compile();

    handler = module.get(NotfallFunkspruchAlertHandler);
  });

  it('emittiert NotfallAlertRequested bei Funkspruch mit Priorität notfall', async () => {
    mockEtbRepo.findById.mockResolvedValue({ einsatzId });

    const event = makeEvent({ type: 'funkspruch', kanalId: kanalId.value, funkPrioritaet: 'notfall' }, { absender: 'Florian 1' });

    await handler.handle(event);

    expect(mockEventPublisher.publish).toHaveBeenCalledTimes(1);
    const published = mockEventPublisher.publish.mock.calls[0][0];
    expect(published).toBeInstanceOf(NotfallAlertRequestedEvent);
    expect(published.einsatzId).toBe(einsatzId);
    expect(published.funkkanalId.value).toBe(kanalId.value);
    expect(published.funkspruchEintragId).toBe(eintragId);
    expect(published.text).toBe('Brand 12');
    expect(published.absender).toBe('Florian 1');
  });

  it('ignoriert Standard-Kontext', async () => {
    const event = makeEvent({ type: 'standard' });
    await handler.handle(event);
    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    expect(mockEtbRepo.findById).not.toHaveBeenCalled();
  });

  it('ignoriert Funkspruch mit Priorität routine', async () => {
    const event = makeEvent({ type: 'funkspruch', kanalId: kanalId.value, funkPrioritaet: 'routine' });
    await handler.handle(event);
    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('ignoriert Funkspruch mit Priorität wichtig', async () => {
    const event = makeEvent({ type: 'funkspruch', kanalId: kanalId.value, funkPrioritaet: 'wichtig' });
    await handler.handle(event);
    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
  });

  it('loggt und returned bei nicht gefundenem ETB', async () => {
    mockEtbRepo.findById.mockResolvedValue(null);
    const event = makeEvent({ type: 'funkspruch', kanalId: kanalId.value, funkPrioritaet: 'notfall' });

    await handler.handle(event);

    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('loggt und returned bei ungültiger kanalId', async () => {
    mockEtbRepo.findById.mockResolvedValue({ einsatzId });
    const event = makeEvent({ type: 'funkspruch', kanalId: 'BAD', funkPrioritaet: 'notfall' });

    await handler.handle(event);

    expect(mockEventPublisher.publish).not.toHaveBeenCalled();
    expect(mockLogger.warn).toHaveBeenCalled();
  });

  it('propagiert keine Exceptions (Fire-and-Forget)', async () => {
    mockEtbRepo.findById.mockRejectedValue(new Error('DB down'));
    const event = makeEvent({ type: 'funkspruch', kanalId: kanalId.value, funkPrioritaet: 'notfall' });

    await expect(handler.handle(event)).resolves.toBeUndefined();
    expect(mockLogger.error).toHaveBeenCalled();
  });
});
