import { Test, type TestingModule } from '@nestjs/testing';
import { GetAlarmierungTimelineQueryHandler } from '../get-alarmierung-timeline.handler';
import { GetAlarmierungTimelineQuery } from '../get-alarmierung-timeline.query';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import type { AlarmierungEmpfaenger } from '@domain/aggregates/alarmierung/alarmierung-empfaenger.entity';
import type { EinsatztagebuchAggregate } from '@domain/aggregates/einsatztagebuch.aggregate';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import type { IEtbRepository } from '@domain/repositories/i-etb.repository';
import { ALARMIERUNG_REPOSITORY, ETB_REPOSITORY } from '@infrastructure/di-tokens';
import { createAlarmierungRepoMock, type AlarmierungRepoMock } from '../../../__tests__/test-doubles';

/** Minimal-Mock für `IEtbRepository` — wir benutzen nur findByEinsatzId. */
type EtbRepoMock = Pick<jest.Mocked<IEtbRepository>, 'findByEinsatzId'>;

describe('GetAlarmierungTimelineQueryHandler', () => {
  let handler: GetAlarmierungTimelineQueryHandler;
  let mockAlarmierungRepo: AlarmierungRepoMock;
  let mockEtbRepo: EtbRepoMock;
  let einsatzId: EinsatzId;

  beforeEach(async () => {
    einsatzId = EinsatzId.create().value as EinsatzId;
    mockAlarmierungRepo = createAlarmierungRepoMock();
    mockEtbRepo = { findByEinsatzId: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [GetAlarmierungTimelineQueryHandler, { provide: ALARMIERUNG_REPOSITORY, useValue: mockAlarmierungRepo }, { provide: ETB_REPOSITORY, useValue: mockEtbRepo }],
    }).compile();
    handler = module.get(GetAlarmierungTimelineQueryHandler);
  });

  it('baut Timeline aus Alarmierung + Empfänger-Zeitpunkten chronologisch ASC', async () => {
    const aggregate = AlarmierungAggregate.create({
      einsatzId,
      bezeichnung: 'Brand',
      alarmierungszeit: new Date('2026-04-15T10:00:00Z'),
      createdBy: 'system',
    }).value as AlarmierungAggregate;
    const addResult = aggregate.fuegeEmpfaengerHinzu({
      ref: { kind: 'fahrzeug', fahrzeugId: 'fz1' },
      nameSnapshot: 'Florian Mainz 12-1',
      createdBy: 'system',
    });
    const empfaenger = addResult.value as AlarmierungEmpfaenger;
    aggregate.korrigiereZeitpunkt(empfaenger.id, 'ausgeruecktAm', new Date('2026-04-15T10:02:00Z'), 'user');
    aggregate.korrigiereZeitpunkt(empfaenger.id, 'vorOrtAm', new Date('2026-04-15T10:05:00Z'), 'user');

    mockAlarmierungRepo.findByEinsatzId.mockResolvedValue([aggregate]);

    const q = GetAlarmierungTimelineQuery.create({ einsatzId: einsatzId.value }).value as GetAlarmierungTimelineQuery;
    const result = await handler.execute(q);

    expect(result.isSuccess).toBe(true);
    const items = result.value ?? [];
    // 1 alarmierung_ausgeloest + 1 empfaenger_alarmiert + 1 empfaenger_ausgerueckt + 1 empfaenger_vor_ort
    expect(items).toHaveLength(4);
    // Chronologisch ASC
    const times = items.map((i) => i.occurredAt.getTime());
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(items[0]?.type).toBe('alarmierung_ausgeloest');
  });

  it('integriert ETB-Einträge mit Kategorie ALARMIERUNG', async () => {
    const aggregate = AlarmierungAggregate.create({
      einsatzId,
      bezeichnung: 'Brand',
      alarmierungszeit: new Date('2026-04-15T10:00:00Z'),
      createdBy: 'system',
    }).value as AlarmierungAggregate;
    mockAlarmierungRepo.findByEinsatzId.mockResolvedValue([aggregate]);

    const fakeEtb = {
      eintraege: [
        {
          isDeleted: false,
          kategorie: { value: 'ALARMIERUNG' },
          ereignisZeitpunkt: new Date('2026-04-15T10:30:00Z'),
          id: { value: 'eintrag-1' },
          text: 'Alarmierung ausgelöst: Brand',
          absender: 'system',
        },
        {
          isDeleted: false,
          kategorie: { value: 'LAGE' },
          ereignisZeitpunkt: new Date('2026-04-15T10:31:00Z'),
          id: { value: 'eintrag-2' },
          text: 'Lage erkundet',
          absender: 'system',
        },
        {
          isDeleted: true,
          kategorie: { value: 'ALARMIERUNG' },
          ereignisZeitpunkt: new Date('2026-04-15T10:32:00Z'),
          id: { value: 'eintrag-3' },
          text: 'gelöscht',
          absender: 'system',
        },
      ],
    } as unknown as EinsatztagebuchAggregate;
    mockEtbRepo.findByEinsatzId.mockResolvedValue(fakeEtb);

    const q = GetAlarmierungTimelineQuery.create({ einsatzId: einsatzId.value }).value as GetAlarmierungTimelineQuery;
    const result = await handler.execute(q);

    expect(result.isSuccess).toBe(true);
    const etbItems = (result.value ?? []).filter((i) => i.type === 'etb_eintrag');
    expect(etbItems).toHaveLength(1);
    expect(etbItems[0]?.data.eintragId).toBe('eintrag-1');
    expect(etbItems[0]?.data.text).toBe('Alarmierung ausgelöst: Brand');
  });

  it('schlägt fehl, wenn alarmierungId-Filter zu fremdem Einsatz gehört', async () => {
    const fremderEinsatz = EinsatzId.create().value as EinsatzId;
    const aggregate = AlarmierungAggregate.create({
      einsatzId: fremderEinsatz,
      bezeichnung: 'Fremd',
      createdBy: 'system',
    }).value as AlarmierungAggregate;
    mockAlarmierungRepo.findById.mockResolvedValue(aggregate);

    const q = GetAlarmierungTimelineQuery.create({
      einsatzId: einsatzId.value,
      alarmierungId: aggregate.id.value,
    }).value as GetAlarmierungTimelineQuery;
    const result = await handler.execute(q);

    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('gehört nicht');
  });

  it('Query lehnt fehlende einsatzId ab', () => {
    const r = GetAlarmierungTimelineQuery.create({ einsatzId: '   ' });
    expect(r.isFailure).toBe(true);
  });
});
