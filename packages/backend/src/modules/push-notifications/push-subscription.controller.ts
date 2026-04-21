import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Inject, InternalServerErrorException, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import type { ILogger } from '@domain/ports/i-logger.port';
import type { IPushSubscriptionRepository } from '@domain/push-notifications/i-push-subscription.repository';
import { PushSubscription } from '@domain/push-notifications/push-subscription.entity';
import { LOGGER, PUSH_SUBSCRIPTION_REPOSITORY } from '@infrastructure/di-tokens';
import { PUSH_SUBSCRIPTION_RATE_LIMIT } from '@infrastructure/http/constants/rate-limit.constants';
import { CreatePushSubscriptionDto } from './dtos/create-push-subscription.dto';
import { PushSubscriptionDto } from './dtos/push-subscription.dto';

/**
 * HTTP-Controller für Plattform-Push-Subscriptions (Story 1.1, ADR-011).
 *
 * Aktuell exponiert nur `POST /users/me/push-subscriptions`. Ein DELETE-
 * Endpoint ist bewusst OUT-OF-SCOPE für 1.1: Clients re-registrieren sich
 * nach Geräte-Zurücksetzen; Server-seitiges Cleanup ablaufender Subscriptions
 * übernimmt der `PushNotificationsService` via 410/404-Handling (AC2).
 */
// TODO(platform): DELETE endpoint — not in 1.1 scope
@ApiTags('push-notifications')
@ApiBearerAuth('access-token')
@Controller({ path: 'users/me/push-subscriptions', version: '1' })
@UseGuards(JwtAuthGuard)
export class PushSubscriptionController {
  constructor(
    @Inject(PUSH_SUBSCRIPTION_REPOSITORY)
    private readonly subscriptions: IPushSubscriptionRepository,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: PUSH_SUBSCRIPTION_RATE_LIMIT })
  @ApiOperation({ summary: 'Web-Push-Subscription registrieren (idempotent)' })
  @ApiBody({ type: CreatePushSubscriptionDto })
  @ApiWrappedCreatedResponse(PushSubscriptionDto, {
    description: 'Subscription registriert oder vorhandene Keys rotiert',
  })
  @ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
  @ApiTooManyRequestsResponse({ description: 'Rate Limit erreicht (max. 10 Registrierungen pro Minute)' })
  async register(@CurrentUser() user: ValidatedUser, @Body() dto: CreatePushSubscriptionDto): Promise<PushSubscriptionDto> {
    const entity = PushSubscription.create({
      userId: user.userId,
      endpoint: dto.endpoint,
      p256dh: dto.keys.p256dh,
      auth: dto.keys.auth,
    });

    if (entity.isFailure || !entity.value) {
      throw new BadRequestException(entity.error ?? 'Ungültige Push-Subscription');
    }

    const upsert = await this.subscriptions.upsertByEndpoint(entity.value);
    if (upsert.isFailure || !upsert.value) {
      this.logger.error('Push-Subscription konnte nicht persistiert werden', {
        userId: user.userId,
        endpointHost: entity.value.getEndpointHost(),
        error: upsert.error,
      });
      if (upsert.error?.includes('belongs to a different user')) {
        throw new BadRequestException('Push-Subscription-Endpoint ist bereits einem anderen Account zugeordnet');
      }
      throw new InternalServerErrorException('Push-Subscription konnte nicht gespeichert werden');
    }

    const saved = upsert.value;

    this.logger.log('Push-Subscription registriert', {
      userId: saved.userId,
      endpointHost: saved.getEndpointHost(),
      createdAt: saved.createdAt.toISOString(),
    });

    const response = new PushSubscriptionDto();
    response.id = saved.id;
    response.userId = saved.userId;
    response.endpoint = saved.endpoint;
    response.createdAt = saved.createdAt;
    response.updatedAt = saved.updatedAt;
    return response;
  }
}
