/**
 * Tests für `EigenschutzTelemetryController` (Story 3.11 AC7, FR21).
 *
 * Guard-Override (JwtAuthGuard) + Service-Mock; Status-Code via Reflect-
 * Metadata. Permission- oder Rollen-Gating ist nicht mehr Bestandteil der
 * Eigenschutz-Controller.
 */
import { BadRequestException, UnauthorizedException, UnprocessableEntityException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { LOGGER } from '@infrastructure/di-tokens';
import { TelemetryIngestService } from '@/infrastructure/eigenschutz/telemetry/telemetry-ingest.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import type { TelemetryEventBatchDto } from '@/application/eigenschutz/dto/telemetry-event.dto';
import { EigenschutzTelemetryController } from '../eigenschutz-telemetry.controller';

/**
 * Internes NestJS-Metadata-Schlüssel für `@HttpCode(...)` (siehe
 * `node_modules/@nestjs/common/constants.js`). Privat-API, aber stabil seit
 * v8 — kein offizieller Re-Export. Wir greifen direkt auf den String zu, um
 * den `202`-Status ohne HTTP-Layer-Boot zu verifizieren.
 */
const HTTP_CODE_METADATA_KEY = '__httpCode__';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui00002';
const USER_ID = 'clw3h8x9y0000qwertyui00099';

function makeBatch(eventCount = 3): TelemetryEventBatchDto {
  return {
    events: Array.from({ length: eventCount }, (_, i) => ({
      eventName: 'all_banners_delivered' as const,
      propagationGroupIdCandidate: `pg-${i}`,
      abschnittCount: 1,
      userId: USER_ID,
      sessionId: 'sess-1',
      clientTime: '2026-05-05T10:00:00.000+02:00',
    })),
  };
}

describe('EigenschutzTelemetryController — Story 3.11 (FR21)', () => {
  let controller: EigenschutzTelemetryController;
  let ingestService: { ingestBatch: jest.Mock };

  beforeEach(async () => {
    ingestService = { ingestBatch: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EigenschutzTelemetryController],
      providers: [
        { provide: TelemetryIngestService, useValue: ingestService },
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EigenschutzTelemetryController);
  });

  it('HTTP-Status-Strukturtest: ingest-Handler liefert 202 Accepted (Best-Effort-Audit, kein 201)', () => {
    // Code-Review-Patch: vorher hatte der Test-Suite gar keine Status-Code-
    // Assertion. Drift wäre still durchgegangen, weil alle anderen Tests den
    // Controller direkt aufrufen (ohne HTTP-Layer).
    const httpCode = Reflect.getMetadata(HTTP_CODE_METADATA_KEY, EigenschutzTelemetryController.prototype.ingest);
    expect(httpCode).toBe(202);
  });

  it('Happy-Path: 3-Event-Batch → ingestBatch wird mit (einsatzId, user.userId, batch) aufgerufen, Response trägt insertedCount=3', async () => {
    ingestService.ingestBatch.mockResolvedValue(Result.ok({ insertedCount: 3 }));

    const batch = makeBatch(3);
    const response = await controller.ingest(EINSATZ_ID, batch, { userId: USER_ID } as never);

    expect(response).toEqual({ insertedCount: 3 });
    expect(ingestService.ingestBatch).toHaveBeenCalledTimes(1);
    expect(ingestService.ingestBatch).toHaveBeenCalledWith(EINSATZ_ID, USER_ID, batch);
  });

  it('Service-Failure (ValidationFailed:*) → 422 UnprocessableEntity mit context.rule="TelemetryValidationFailed", KEIN Roh-Error im message-Body', async () => {
    // Code-Review-Patch: Roh-Error-Strings (z. B. mit FK-/Field-Detail) dürfen
    // nicht via `message` durchschlagen. Validation-Failures werden auf einen
    // stabilen Marker gemappt; Persist-Failures auf einen anderen.
    ingestService.ingestBatch.mockResolvedValue(Result.fail('ValidationFailed:TelemetryBatch:abschnittCount'));

    const promise = controller.ingest(EINSATZ_ID, makeBatch(), { userId: USER_ID } as never);
    await expect(promise).rejects.toBeInstanceOf(UnprocessableEntityException);

    try {
      await controller.ingest(EINSATZ_ID, makeBatch(), { userId: USER_ID } as never);
      throw new Error('expected throw');
    } catch (e) {
      if (!(e instanceof UnprocessableEntityException)) throw e;
      const response = e.getResponse() as { statusCode: number; context: { rule: string }; message: string };
      expect(response.statusCode).toBe(422);
      expect(response.context.rule).toBe('TelemetryValidationFailed');
      expect(response.message).toBe('TelemetryValidationFailed');
      // Defense-in-Depth: keine Internals (Field-Names, SQL-Detail) im Body.
      expect(response.message).not.toContain('abschnittCount');
      expect(response.message).not.toContain('TelemetryBatch');
    }
  });

  it('Service-Failure (PersistTelemetryFailed:*) → 422, message ist Sentinel "TelemetryIngestFailed", KEIN Prisma-Code-Leak', async () => {
    // Code-Review-Patch: vorher leakte `PersistTelemetryFailed:Foreign key …`
    // direkt in den HTTP-Body. Jetzt fester Sentinel; Detail bleibt im Log.
    ingestService.ingestBatch.mockResolvedValue(Result.fail('PersistTelemetryFailed:prisma-p2003'));

    try {
      await controller.ingest(EINSATZ_ID, makeBatch(), { userId: USER_ID } as never);
      throw new Error('expected throw');
    } catch (e) {
      if (!(e instanceof UnprocessableEntityException)) throw e;
      const response = e.getResponse() as { statusCode: number; context: { rule: string }; message: string };
      expect(response.statusCode).toBe(422);
      expect(response.context.rule).toBe('TelemetryIngestFailed');
      expect(response.message).toBe('TelemetryIngestFailed');
      expect(response.message).not.toContain('prisma');
      expect(response.message).not.toContain('p2003');
    }
  });

  it('Bad-Request: malformed einsatzId → 400 BadRequestException, ingestService NICHT aufgerufen', async () => {
    // Defense-in-Depth: Ein nicht-CUID2-Wert würde sonst direkt in die
    // Persist-Schicht wandern und einen FK-Throw provozieren.
    await expect(controller.ingest('not-a-cuid', makeBatch(), { userId: USER_ID } as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(ingestService.ingestBatch).not.toHaveBeenCalled();
  });

  it('Unauthorized: user.userId fehlt (Defense-in-Depth) → 401 UnauthorizedException', async () => {
    // JwtAuthGuard sollte das vorab abfangen, aber der Controller lehnt sich
    // nicht blind auf den Guard — ohne userId kann nichts persistiert werden.
    await expect(controller.ingest(EINSATZ_ID, makeBatch(), { userId: '' } as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ingestService.ingestBatch).not.toHaveBeenCalled();
  });

  it('Unauthorized: user.userId > 80 Zeichen (DB-VarChar-Cap) → 401', async () => {
    const tooLongUserId = 'x'.repeat(81);
    await expect(controller.ingest(EINSATZ_ID, makeBatch(), { userId: tooLongUserId } as never)).rejects.toBeInstanceOf(UnauthorizedException);
    expect(ingestService.ingestBatch).not.toHaveBeenCalled();
  });

  it('Caller-userId wird IMMER aus JWT übernommen (auch wenn Body-userId abweicht)', async () => {
    ingestService.ingestBatch.mockResolvedValue(Result.ok({ insertedCount: 1 }));

    const batch = makeBatch(1);
    // Body trägt eine andere userId — der Controller leitet trotzdem die JWT-userId weiter.
    batch.events[0]!.userId = 'clw3attackerwertyui00099';

    await controller.ingest(EINSATZ_ID, batch, { userId: USER_ID } as never);

    // Service-Argument: callerUserId === USER_ID (aus JWT)
    expect(ingestService.ingestBatch).toHaveBeenCalledWith(EINSATZ_ID, USER_ID, batch);
  });

  it('Result.value undefined → 422 UnprocessableEntity (Defensive Branch)', async () => {
    ingestService.ingestBatch.mockResolvedValue(Result.ok(undefined as never));

    await expect(controller.ingest(EINSATZ_ID, makeBatch(), { userId: USER_ID } as never)).rejects.toBeInstanceOf(UnprocessableEntityException);
  });
});
