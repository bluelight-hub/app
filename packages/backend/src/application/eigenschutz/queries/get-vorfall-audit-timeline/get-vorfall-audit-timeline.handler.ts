import { Inject, Injectable } from '@nestjs/common';
import { QueryHandler, type IQueryHandler } from '@nestjs/cqrs';
import { EVENT_NAMES } from '@domain/events/event-names';
import { Result } from '@domain/common/result';
import type { IEigenschutzVorfallRepository } from '@domain/eigenschutz/repositories';
import type { IOutboxRepository, OutboxEventDto } from '@domain/repositories/i-outbox.repository';
import type { IUserRepository } from '@domain/repositories/i-user.repository';
import { UserId } from '@domain/value-objects/user-id';
import { EIGENSCHUTZ_VORFALL_REPOSITORY, OUTBOX_REPOSITORY, USER_REPOSITORY } from '@infrastructure/di-tokens';
import type { SerializedEvent } from '@/infrastructure/outbox/event-serializer';
import { GetVorfallAuditTimelineQuery } from './get-vorfall-audit-timeline.query';

export const GET_VORFALL_AUDIT_TIMELINE_ERROR_CODES = {
  NOT_FOUND: 'NotFound:Vorfall',
} as const;

export interface VorfallAuditTimelineEintragReadModel {
  readonly id: string;
  readonly type: 'exported';
  readonly occurredAt: Date;
  readonly userId: string;
  readonly userName: string | null;
  readonly format: 'pdf' | 'json';
  readonly label: string;
}

export interface VorfallAuditTimelineReadModel {
  readonly eintraege: VorfallAuditTimelineEintragReadModel[];
}

interface VorfallExportiertPayload {
  readonly einsatzId: string;
  readonly userId: string;
  readonly vorfallId: string;
  readonly format: 'pdf' | 'json';
  readonly downloadedAt: string;
}

@Injectable()
@QueryHandler(GetVorfallAuditTimelineQuery)
export class GetVorfallAuditTimelineHandler implements IQueryHandler<GetVorfallAuditTimelineQuery, Result<VorfallAuditTimelineReadModel>> {
  constructor(
    @Inject(EIGENSCHUTZ_VORFALL_REPOSITORY)
    private readonly vorfallRepo: IEigenschutzVorfallRepository,
    @Inject(OUTBOX_REPOSITORY)
    private readonly outboxRepository: IOutboxRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: IUserRepository,
  ) {}

  async execute(query: GetVorfallAuditTimelineQuery): Promise<Result<VorfallAuditTimelineReadModel>> {
    const vorfallResult = await this.vorfallRepo.findById(query.vorfallId);
    if (vorfallResult.isFailure) {
      return Result.fail<VorfallAuditTimelineReadModel>(vorfallResult.error ?? 'InfrastructureError:LoadVorfallAuditTimeline:Vorfall');
    }
    const vorfall = vorfallResult.value;
    if (!vorfall || vorfall.einsatzId !== query.einsatzId) {
      return Result.fail<VorfallAuditTimelineReadModel>(GET_VORFALL_AUDIT_TIMELINE_ERROR_CODES.NOT_FOUND);
    }

    let outboxEvents: OutboxEventDto[];
    try {
      outboxEvents = await this.outboxRepository.findByAggregateId(query.vorfallId);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown';
      return Result.fail<VorfallAuditTimelineReadModel>(`InfrastructureError:VorfallAuditTimeline:Outbox:${message}`);
    }

    const exportEvents = outboxEvents.filter((event) => event.eventName === EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT);
    const payloads: Array<{ event: OutboxEventDto; payload: VorfallExportiertPayload; occurredAt: Date }> = [];
    for (const event of exportEvents) {
      const parsed = this.parseExportPayload(event);
      if (parsed.isFailure || !parsed.value) {
        return Result.fail<VorfallAuditTimelineReadModel>(parsed.error ?? 'InfrastructureError:VorfallAuditTimeline:MalformedPayload');
      }
      if (parsed.value.einsatzId !== query.einsatzId || parsed.value.vorfallId !== query.vorfallId) {
        return Result.fail<VorfallAuditTimelineReadModel>('InfrastructureError:VorfallAuditTimeline:AggregatePayloadMismatch');
      }
      const downloadedAt = new Date(parsed.value.downloadedAt);
      if (Number.isNaN(downloadedAt.getTime())) {
        return Result.fail<VorfallAuditTimelineReadModel>('InfrastructureError:VorfallAuditTimeline:downloadedAtInvalid');
      }
      const occurredAt = event.occurredAt;
      payloads.push({ event, payload: parsed.value, occurredAt });
    }

    const userIdToName = await this.resolveUserNames(payloads.map((entry) => entry.payload.userId));
    const eintraege = payloads
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())
      .map(({ event, payload, occurredAt }): VorfallAuditTimelineEintragReadModel => {
        const userName = userIdToName.get(payload.userId) ?? null;
        const format = payload.format;
        const displayUser = userName ?? this.shortId(payload.userId);
        return {
          id: event.id,
          type: 'exported',
          occurredAt,
          userId: payload.userId,
          userName,
          format,
          label: `Export durch ${displayUser} als ${format.toUpperCase()} am ${occurredAt.toISOString()}`,
        };
      });

    return Result.ok<VorfallAuditTimelineReadModel>({ eintraege });
  }

  private parseExportPayload(event: OutboxEventDto): Result<VorfallExportiertPayload> {
    const payload = this.unwrapSerializedPayload(event.payload);
    if (!payload) {
      return Result.fail<VorfallExportiertPayload>('InfrastructureError:VorfallAuditTimeline:MalformedPayload');
    }
    const candidate = payload.payload;
    if (!this.isVorfallExportiertPayload(candidate)) {
      return Result.fail<VorfallExportiertPayload>('InfrastructureError:VorfallAuditTimeline:MalformedPayload');
    }
    return Result.ok(candidate);
  }

  private unwrapSerializedPayload(payload: unknown): SerializedEvent | null {
    if (!payload || typeof payload !== 'object') return null;
    const candidate = payload as Partial<SerializedEvent>;
    if (candidate.eventName !== EVENT_NAMES.EIGENSCHUTZ.VORFALL_EXPORTIERT || typeof candidate.payload !== 'object' || candidate.payload === null) return null;
    return candidate as SerializedEvent;
  }

  private isVorfallExportiertPayload(payload: unknown): payload is VorfallExportiertPayload {
    if (!payload || typeof payload !== 'object') return false;
    const candidate = payload as Partial<VorfallExportiertPayload>;
    return (
      typeof candidate.einsatzId === 'string' &&
      typeof candidate.userId === 'string' &&
      typeof candidate.vorfallId === 'string' &&
      (candidate.format === 'pdf' || candidate.format === 'json') &&
      typeof candidate.downloadedAt === 'string'
    );
  }

  private async resolveUserNames(userIds: readonly string[]): Promise<Map<string, string | null>> {
    const distinctIds = Array.from(new Set(userIds));
    const entries = await Promise.all(distinctIds.map(async (rawId): Promise<[string, string | null]> => [rawId, await this.resolveUserName(rawId)]));
    return new Map(entries);
  }

  private async resolveUserName(rawUserId: string): Promise<string | null> {
    const userIdResult = UserId.create(rawUserId);
    if (userIdResult.isFailure || !userIdResult.value) return null;
    let userResult: Awaited<ReturnType<IUserRepository['findById']>>;
    try {
      userResult = await this.userRepository.findById(userIdResult.value);
    } catch {
      return null;
    }
    if (userResult.isFailure || !userResult.value) return null;
    return userResult.value.username.value;
  }

  private shortId(id: string): string {
    return id.length <= 8 ? id : id.slice(0, 8);
  }
}
