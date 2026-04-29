import { Test, type TestingModule } from '@nestjs/testing';
import { QuittungUeberfaelligEvent } from '@domain/eigenschutz/events/quittung-ueberfaellig.event';
import type { ILogger } from '@domain/ports/i-logger.port';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { LOGGER, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import { EMIT_PSA_QUITTUNG_UEBERFAELLIG_ERROR_CODES, EmitPsaQuittungUeberfaelligHandler } from '../emit-psa-quittung-ueberfaellig.handler';
import { EmitPsaQuittungUeberfaelligCommand } from '../emit-psa-quittung-ueberfaellig.command';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui00050';
const PROPAGATION_GROUP_ID = 'clw3h8x9y0000qwertyuipgrp01';
const ORIGINAL_EVENT_ID = 'clw3h8x9y0000qwertyui00orig';
const ZUWEISUNG_ID = 'clw3h8x9y0000qwertyuizuw0001';

interface OutboxEventMock {
  findFirst: jest.Mock;
}
interface PsaProfilQuittungMock {
  findFirst: jest.Mock;
}
interface TxMock {
  outboxEvent: OutboxEventMock;
  psaProfilQuittung: PsaProfilQuittungMock;
}

describe('EmitPsaQuittungUeberfaelligHandler (Story 3.7 AC4)', () => {
  let handler: EmitPsaQuittungUeberfaelligHandler;
  let outboxRepo: { save: jest.Mock };
  let prisma: { $transaction: jest.Mock };
  let logger: jest.Mocked<ILogger>;
  let txMock: TxMock;

  beforeEach(async () => {
    txMock = {
      outboxEvent: { findFirst: jest.fn().mockResolvedValue(null) },
      psaProfilQuittung: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    outboxRepo = { save: jest.fn().mockResolvedValue(undefined) };
    prisma = { $transaction: jest.fn().mockImplementation(async (callback: (tx: TxMock) => Promise<unknown>) => callback(txMock)) };
    logger = { log: jest.fn(), error: jest.fn(), warn: jest.fn(), debug: jest.fn() } as unknown as jest.Mocked<ILogger>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [EmitPsaQuittungUeberfaelligHandler, { provide: PrismaService, useValue: prisma }, { provide: OUTBOX_REPOSITORY, useValue: outboxRepo }, { provide: LOGGER, useValue: logger }],
    }).compile();

    handler = module.get(EmitPsaQuittungUeberfaelligHandler);
  });

  afterEach(() => jest.clearAllMocks());

  function makeCommand(overrides: Partial<EmitPsaQuittungUeberfaelligCommand> = {}) {
    return new EmitPsaQuittungUeberfaelligCommand(
      overrides.einsatzId ?? EINSATZ_ID,
      overrides.einheitId ?? EINHEIT_ID,
      overrides.propagationGroupId ?? PROPAGATION_GROUP_ID,
      overrides.originalEventId ?? ORIGINAL_EVENT_ID,
      overrides.ueberfaelligSeitMin ?? 6,
      'zuweisungId' in overrides ? (overrides.zuweisungId as string | null) : ZUWEISUNG_ID,
    );
  }

  it('(Happy-Path) emittiert QuittungUeberfaelligEvent mit allen Pflichtfeldern', async () => {
    const result = await handler.execute(makeCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value!.emitted).toBe(true);

    expect(outboxRepo.save).toHaveBeenCalledTimes(1);
    const savedEvents = outboxRepo.save.mock.calls[0][0] as QuittungUeberfaelligEvent[];
    expect(savedEvents).toHaveLength(1);
    const event = savedEvents[0];
    expect(event).toBeInstanceOf(QuittungUeberfaelligEvent);
    expect(event.einsatzId).toBe(EINSATZ_ID);
    expect(event.einheitId).toBe(EINHEIT_ID);
    expect(event.propagationGroupId).toBe(PROPAGATION_GROUP_ID);
    expect(event.originalEventId).toBe(ORIGINAL_EVENT_ID);
    expect(event.ueberfaelligSeitMin).toBe(6);
    expect(event.zuweisungId).toBe(ZUWEISUNG_ID);
    expect(event.userId).toBe('SYSTEM');
  });

  it('(Race-Cond a) skippt Event, wenn Quittung inzwischen abgegeben wurde', async () => {
    txMock.psaProfilQuittung.findFirst.mockResolvedValue({ id: 'q-1' });

    const result = await handler.execute(makeCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value!.emitted).toBe(false);
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('(Race-Cond b) skippt Event, wenn Überfällig-Event bereits in der Outbox liegt', async () => {
    txMock.outboxEvent.findFirst.mockResolvedValue({ id: 'evt-1' });

    const result = await handler.execute(makeCommand());

    expect(result.isSuccess).toBe(true);
    expect(result.value!.emitted).toBe(false);
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('akzeptiert zuweisungId === null', async () => {
    const result = await handler.execute(makeCommand({ zuweisungId: null }));

    expect(result.isSuccess).toBe(true);
    const savedEvents = outboxRepo.save.mock.calls[0][0] as QuittungUeberfaelligEvent[];
    expect(savedEvents[0].zuweisungId).toBeNull();
  });

  it('wraps Repo-Fehler aus Idempotenz-Re-Check als InfrastructureError-Sentinel', async () => {
    txMock.psaProfilQuittung.findFirst.mockRejectedValue(new Error('connection lost'));

    const result = await handler.execute(makeCommand());

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain(EMIT_PSA_QUITTUNG_UEBERFAELLIG_ERROR_CODES.INFRASTRUCTURE_ERROR);
    expect(result.error).toContain('connection lost');
    expect(outboxRepo.save).not.toHaveBeenCalled();
  });

  it('läuft die gesamte Pipeline in der Tx (prisma.$transaction wird einmal aufgerufen)', async () => {
    await handler.execute(makeCommand());
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});
