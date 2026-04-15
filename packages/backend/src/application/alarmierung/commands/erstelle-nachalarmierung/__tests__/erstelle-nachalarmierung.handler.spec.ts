import { Test, type TestingModule } from '@nestjs/testing';
import { ErstelleNachalarmierungHandler } from '../erstelle-nachalarmierung.handler';
import { ErstelleNachalarmierungCommand } from '../erstelle-nachalarmierung.command';
import { ErstelleAlarmierungHandler } from '../../erstelle-alarmierung/erstelle-alarmierung.handler';
import { AlarmierungAggregate } from '@domain/aggregates/alarmierung/alarmierung.aggregate';
import { NachalarmierungErstelltEvent } from '@domain/events/nachalarmierung-erstellt.event';
import { AlarmierungId } from '@domain/value-objects/alarmierung-id';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Result } from '@domain/common/result';
import type { DomainEvent } from '@domain/common/domain-event';
import type { EinsatzFahrzeug } from '@domain/kraefte/aggregates/einsatz-fahrzeug.aggregate';
import { PrismaService } from '@/infrastructure/database/prisma.service';
import { ALARMIERUNG_REPOSITORY, KRAEFTE_REPOSITORIES, OUTBOX_REPOSITORY } from '@infrastructure/di-tokens';
import {
  asPrismaService,
  createAlarmierungRepoMock,
  createEinsatzEinheitRepoMock,
  createEinsatzFahrzeugRepoMock,
  createEinsatzPersonRepoMock,
  createOutboxRepoMock,
  createPrismaMock,
  type AlarmierungRepoMock,
  type EinsatzEinheitRepoMock,
  type EinsatzFahrzeugRepoMock,
  type EinsatzPersonRepoMock,
  type OutboxRepoMock,
  type PrismaServiceMock,
} from '../../../__tests__/test-doubles';

function makeUrsprung(einsatzId: EinsatzId): AlarmierungAggregate {
  const aggregate = AlarmierungAggregate.create({
    einsatzId,
    bezeichnung: 'Ursprung',
    createdBy: 'system',
  }).value as AlarmierungAggregate;
  aggregate.clearDomainEvents();
  return aggregate;
}

describe('ErstelleNachalarmierungHandler', () => {
  let handler: ErstelleNachalarmierungHandler;
  let mockRepo: AlarmierungRepoMock;
  let mockOutbox: OutboxRepoMock;
  let mockPrisma: PrismaServiceMock;
  let einsatzIdStr: string;
  let einsatzId: EinsatzId;

  beforeEach(async () => {
    jest.clearAllMocks();
    einsatzId = EinsatzId.create().value as EinsatzId;
    einsatzIdStr = einsatzId.value;
    mockRepo = createAlarmierungRepoMock();
    mockOutbox = createOutboxRepoMock();
    mockPrisma = createPrismaMock();

    const fahrzeugRepo: EinsatzFahrzeugRepoMock = createEinsatzFahrzeugRepoMock();
    const personRepo: EinsatzPersonRepoMock = createEinsatzPersonRepoMock();
    const einheitRepo: EinsatzEinheitRepoMock = createEinsatzEinheitRepoMock();
    fahrzeugRepo.findById.mockResolvedValue(Result.ok({ funkrufname: 'Florian Mainz 12-1' } as unknown as EinsatzFahrzeug));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ErstelleNachalarmierungHandler,
        ErstelleAlarmierungHandler,
        { provide: PrismaService, useValue: asPrismaService(mockPrisma) },
        { provide: OUTBOX_REPOSITORY, useValue: mockOutbox },
        { provide: ALARMIERUNG_REPOSITORY, useValue: mockRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_FAHRZEUG, useValue: fahrzeugRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_PERSON, useValue: personRepo },
        { provide: KRAEFTE_REPOSITORIES.EINSATZ_EINHEIT, useValue: einheitRepo },
      ],
    }).compile();

    handler = module.get(ErstelleNachalarmierungHandler);
  });

  it('legt eine Nachalarmierung an, wenn Ursprung existiert und zum Einsatz gehört', async () => {
    const ursprung = makeUrsprung(einsatzId);
    mockRepo.findById.mockResolvedValue(ursprung);

    const cmd = ErstelleNachalarmierungCommand.create({
      einsatzId: einsatzIdStr,
      ursprungAlarmierungId: ursprung.id.value,
      bezeichnung: 'Verstärkung',
      empfaenger: [{ kind: 'fahrzeug', fahrzeugId: 'fz1' }],
      createdBy: 'user-1',
    }).value as ErstelleNachalarmierungCommand;

    const result = await handler.execute(cmd);
    expect(result.isSuccess).toBe(true);
    const aggregate = result.value as AlarmierungAggregate;
    expect(aggregate.istNachalarmierung).toBe(true);
    expect(aggregate.ursprungAlarmierungId?.value).toBe(ursprung.id.value);
    const events = mockOutbox.save.mock.calls[0]?.[0] as DomainEvent[];
    expect(events.some((e) => e instanceof NachalarmierungErstelltEvent)).toBe(true);
  });

  it('schlägt fehl, wenn Ursprung nicht existiert', async () => {
    mockRepo.findById.mockResolvedValue(null);
    const cmd = ErstelleNachalarmierungCommand.create({
      einsatzId: einsatzIdStr,
      ursprungAlarmierungId: (AlarmierungId.create().value as AlarmierungId).value,
      bezeichnung: 'Verstärkung',
      empfaenger: [{ kind: 'fahrzeug', fahrzeugId: 'fz1' }],
      createdBy: 'user-1',
    }).value as ErstelleNachalarmierungCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('Ursprungs-Alarmierung nicht gefunden');
  });

  it('schlägt fehl, wenn Ursprung zu anderem Einsatz gehört', async () => {
    const fremderEinsatz = EinsatzId.create().value as EinsatzId;
    const ursprung = makeUrsprung(fremderEinsatz);
    mockRepo.findById.mockResolvedValue(ursprung);

    const cmd = ErstelleNachalarmierungCommand.create({
      einsatzId: einsatzIdStr,
      ursprungAlarmierungId: ursprung.id.value,
      bezeichnung: 'Verstärkung',
      empfaenger: [{ kind: 'fahrzeug', fahrzeugId: 'fz1' }],
      createdBy: 'user-1',
    }).value as ErstelleNachalarmierungCommand;

    const result = await handler.execute(cmd);
    expect(result.isFailure).toBe(true);
    expect(result.error).toContain('gehört nicht zum');
  });
});
