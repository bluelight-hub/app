import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import type { IOutboxRepository, OutboxEventDto } from '@domain/repositories/i-outbox.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { EVENT_NAMES } from '@domain/events/event-names';
import { GetVorfallAuditTimelineQuery } from '../get-vorfall-audit-timeline.query';
import { GetVorfallAuditTimelineHandler } from '../get-vorfall-audit-timeline.handler';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
const OTHER_EINSATZ_ID = 'clw3h8x9y0000qwertyui05999';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui05002';
const USER_ID = 'clw3h8x9y0000qwertyui05003';
const VORFALL_ID = 'clw3h8x9y0000qwertyui05004';
const NOW = new Date('2026-05-07T10:00:00.000Z');

const VALID_SNAPSHOT = {
  schemaVersion: 1 as const,
  snapshotAt: NOW.toISOString(),
  einsatzId: EINSATZ_ID,
  einheitId: EINHEIT_ID,
  gefaehrdungsbeurteilung: null,
  aktivePsaProfile: [],
  sicherheitsregeln: [],
};

function buildAggregate(overrides: { einsatzId?: string } = {}) {
  return EigenschutzVorfall.create({
    id: VORFALL_ID,
    einsatzId: overrides.einsatzId ?? EINSATZ_ID,
    einheitId: EINHEIT_ID,
    vorfallZeit: NOW,
    wann: NOW,
    was: 'Sturz beim Aufbau',
    wo: null,
    beteiligte: [],
    massnahmen: 'Erstversorgung',
    unfallkasseRelevant: true,
    erfasstVonUserId: USER_ID,
    kontextSnapshot: VALID_SNAPSHOT,
    now: NOW,
  }).value!;
}

function buildOutboxEvent(overrides: Partial<OutboxEventDto> & { payloadOverrides?: Record<string, unknown> } = {}): OutboxEventDto {
  const downloadedAt = overrides.occurredAt ?? NOW;
  return {
    id: overrides.id ?? 'evt-1',
    eventName: overrides.eventName ?? EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT,
    eventVersion: 1,
    aggregateId: overrides.aggregateId ?? VORFALL_ID,
    payload: {
      eventId: overrides.id ?? 'evt-1',
      eventName: overrides.eventName ?? EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT,
      eventVersion: 1,
      occurredAt: downloadedAt.toISOString(),
      aggregateId: overrides.aggregateId ?? VORFALL_ID,
      payload: {
        einsatzId: EINSATZ_ID,
        userId: USER_ID,
        vorfallId: VORFALL_ID,
        format: 'pdf',
        downloadedAt: downloadedAt.toISOString(),
        ...overrides.payloadOverrides,
      },
    },
    status: 'PENDING',
    retryCount: 0,
    lastFailureReason: null,
    createdAt: overrides.createdAt ?? downloadedAt,
    occurredAt: downloadedAt,
    publishedAt: null,
    ...overrides,
  };
}

function buildHandler(
  overrides: {
    aggregate?: EigenschutzVorfall | null;
    outboxEvents?: OutboxEventDto[];
    userName?: string | null;
    userRepoFailure?: boolean;
    userRepoThrows?: boolean;
  } = {},
) {
  const vorfallRepo: IEigenschutzVorfallRepository = {
    save: jest.fn().mockResolvedValue(Result.ok(undefined)),
    findById: jest.fn().mockResolvedValue(Result.ok(overrides.aggregate ?? buildAggregate())),
    existsInEinsatz: jest.fn().mockResolvedValue(Result.ok(true)),
    findByEinsatzWithFilters: jest.fn().mockResolvedValue(Result.ok([])),
  };
  const outboxRepository: IOutboxRepository = {
    save: jest.fn(),
    findAndLockPending: jest.fn(),
    markAsPublished: jest.fn(),
    markAsFailed: jest.fn(),
    markAsPermanentlyFailed: jest.fn(),
    getRetryCount: jest.fn(),
    findByAggregateId: jest.fn().mockResolvedValue(overrides.outboxEvents ?? []),
  };
  const findUserById = jest.fn();
  if (overrides.userRepoThrows) {
    findUserById.mockRejectedValue(new Error('user repository unavailable'));
  } else {
    findUserById.mockResolvedValue(
      overrides.userRepoFailure ? Result.fail('InfrastructureError:UserDown') : Result.ok(overrides.userName === null ? null : { username: { value: overrides.userName ?? 'rubeen' } }),
    );
  }
  const userRepository: IUserRepository = {
    findById: findUserById,
    findByUsername: jest.fn(),
    findAll: jest.fn(),
    save: jest.fn(),
    countSuperAdmins: jest.fn(),
    existsByUsername: jest.fn(),
    countByRoles: jest.fn(),
    countActiveByRoles: jest.fn(),
  } as unknown as IUserRepository;
  const handler = new GetVorfallAuditTimelineHandler(vorfallRepo, outboxRepository, userRepository);
  return { handler, vorfallRepo, outboxRepository, userRepository };
}

describe('GetVorfallAuditTimelineHandler (Story 5.6)', () => {
  it('(1) liefert Export-Events chronologisch und löst Usernamen auf', async () => {
    const first = buildOutboxEvent({ id: 'evt-1', occurredAt: new Date('2026-05-07T09:00:00.000Z'), payloadOverrides: { format: 'pdf', downloadedAt: '2026-05-07T09:00:00.000Z' } });
    const second = buildOutboxEvent({ id: 'evt-2', occurredAt: new Date('2026-05-07T10:00:00.000Z'), payloadOverrides: { format: 'json', downloadedAt: '2026-05-07T10:00:00.000Z' } });
    const { handler, outboxRepository } = buildHandler({ outboxEvents: [second, first], userName: 'Rubeen' });

    const result = await handler.execute(new GetVorfallAuditTimelineQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isSuccess).toBe(true);
    expect(outboxRepository.findByAggregateId).toHaveBeenCalledWith(VORFALL_ID);
    expect(result.value?.eintraege.map((entry) => entry.id)).toEqual(['evt-1', 'evt-2']);
    expect(result.value?.eintraege[0].format).toBe('pdf');
    expect(result.value?.eintraege[0].userName).toBe('Rubeen');
    expect(result.value?.eintraege[1].format).toBe('json');
  });

  it('(2) filtert Events anderer Namen aus', async () => {
    const { handler } = buildHandler({ outboxEvents: [buildOutboxEvent({ eventName: EVENT_NAMES.EIGENSCHUTZ.VORFALL_GEMELDET })] });

    const result = await handler.execute(new GetVorfallAuditTimelineQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value?.eintraege).toEqual([]);
  });

  it('(3) fremder Einsatz liefert NotFound:Vorfall', async () => {
    const { handler } = buildHandler({ aggregate: buildAggregate({ einsatzId: OTHER_EINSATZ_ID }) });

    const result = await handler.execute(new GetVorfallAuditTimelineQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toBe('NotFound:Vorfall');
  });

  it('(4) nicht auflösbarer User blockiert Timeline nicht', async () => {
    const { handler } = buildHandler({ outboxEvents: [buildOutboxEvent()], userRepoThrows: true });

    const result = await handler.execute(new GetVorfallAuditTimelineQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value?.eintraege[0].userName).toBeNull();
  });

  it('(5) nutzt Outbox occurredAt für Anzeigezeit und chronologische Sortierung', async () => {
    const laterDownloadEarlierEvent = buildOutboxEvent({
      id: 'evt-early',
      occurredAt: new Date('2026-05-07T08:00:00.000Z'),
      payloadOverrides: { format: 'pdf', downloadedAt: '2026-05-07T12:00:00.000Z' },
    });
    const earlierDownloadLaterEvent = buildOutboxEvent({
      id: 'evt-late',
      occurredAt: new Date('2026-05-07T09:00:00.000Z'),
      payloadOverrides: { format: 'json', downloadedAt: '2026-05-07T07:00:00.000Z' },
    });
    const { handler } = buildHandler({ outboxEvents: [earlierDownloadLaterEvent, laterDownloadEarlierEvent], userName: 'Rubeen' });

    const result = await handler.execute(new GetVorfallAuditTimelineQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isSuccess).toBe(true);
    expect(result.value?.eintraege.map((entry) => entry.id)).toEqual(['evt-early', 'evt-late']);
    expect(result.value?.eintraege.map((entry) => entry.occurredAt.toISOString())).toEqual(['2026-05-07T08:00:00.000Z', '2026-05-07T09:00:00.000Z']);
    expect(result.value?.eintraege[0].label).toContain('2026-05-07T08:00:00.000Z');
  });

  it('(6) malformed Payload wird als InfrastructureError sichtbar', async () => {
    const { handler } = buildHandler({ outboxEvents: [buildOutboxEvent({ payloadOverrides: { format: 'xml' } })] });

    const result = await handler.execute(new GetVorfallAuditTimelineQuery(EINSATZ_ID, VORFALL_ID));

    expect(result.isFailure).toBe(true);
    expect(result.error).toMatch(/^InfrastructureError:VorfallAuditTimeline:/);
  });
});
