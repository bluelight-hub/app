import { BadRequestException, ForbiddenException, InternalServerErrorException, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { Test, type TestingModule } from '@nestjs/testing';
import { Result } from '@domain/common/result';
import { EigenschutzVorfall } from '@domain/eigenschutz/aggregates/eigenschutz-vorfall.aggregate';
import type { IEigenschutzVorfallRepository, VorfallListReadRow } from '@domain/eigenschutz/repositories';
import { ReportVorfallCommand } from '@/application/eigenschutz/commands/report-vorfall/report-vorfall.command';
import { AuditVorfallExportCommand } from '@/application/eigenschutz/commands/audit-vorfall-export/audit-vorfall-export.command';
import { GetVorfallAuditTimelineQuery } from '@/application/eigenschutz/queries/get-vorfall-audit-timeline/get-vorfall-audit-timeline.query';
import { ListVorfaelleQuery } from '@/application/eigenschutz/queries/list-vorfaelle/list-vorfaelle.query';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { EIGENSCHUTZ_VORFALL_JSON_RENDERER, EIGENSCHUTZ_VORFALL_PDF_RENDERER, EIGENSCHUTZ_VORFALL_REPOSITORY, LOGGER } from '@infrastructure/di-tokens';
import { EigenschutzVorfallController } from '../eigenschutz-vorfall.controller';

const EINSATZ_ID = 'clw3h8x9y0000qwertyui05001';
const EINHEIT_ID = 'clw3h8x9y0000qwertyui05002';
const USER_ID = 'clw3h8x9y0000qwertyui05003';
const NOW = new Date('2026-05-06T10:00:00.000Z');

const VALID_SNAPSHOT = {
  schemaVersion: 1 as const,
  snapshotAt: NOW.toISOString(),
  einsatzId: EINSATZ_ID,
  einheitId: EINHEIT_ID,
  gefaehrdungsbeurteilung: null,
  aktivePsaProfile: [],
  sicherheitsregeln: [],
};

function buildAggregate() {
  return EigenschutzVorfall.create({
    einsatzId: EINSATZ_ID,
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

describe('EigenschutzVorfallController (Story 5.1 + 5.2)', () => {
  let controller: EigenschutzVorfallController;
  let commandBus: { execute: jest.Mock };
  let queryBus: { execute: jest.Mock };
  let vorfallRepo: { findById: jest.Mock; save: jest.Mock; existsInEinsatz: jest.Mock };
  let pdfRenderer: { generate: jest.Mock };
  let jsonRenderer: { generate: jest.Mock };

  beforeEach(async () => {
    commandBus = { execute: jest.fn() };
    queryBus = { execute: jest.fn() };
    vorfallRepo = { findById: jest.fn(), save: jest.fn(), existsInEinsatz: jest.fn() };
    pdfRenderer = { generate: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4 fake')) };
    jsonRenderer = { generate: jest.fn().mockResolvedValue(Buffer.from('{"schemaVersion":1}', 'utf-8')) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EigenschutzVorfallController],
      providers: [
        { provide: CommandBus, useValue: commandBus },
        { provide: QueryBus, useValue: queryBus },
        { provide: LOGGER, useValue: { log: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } },
        { provide: EIGENSCHUTZ_VORFALL_REPOSITORY, useValue: vorfallRepo as unknown as IEigenschutzVorfallRepository },
        { provide: EIGENSCHUTZ_VORFALL_PDF_RENDERER, useValue: pdfRenderer },
        { provide: EIGENSCHUTZ_VORFALL_JSON_RENDERER, useValue: jsonRenderer },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(EigenschutzVorfallController);
  });

  describe('Guard-Kette + Routing', () => {
    it('(1) trägt nur JwtAuthGuard auf Klassen-Ebene', () => {
      const guards = Reflect.getMetadata('__guards__', EigenschutzVorfallController) as unknown[];
      expect(guards).toBeDefined();
      expect(guards).toHaveLength(1);
      expect(guards[0]).toBe(JwtAuthGuard);
    });

    it('(2) Routing trägt einsatz-scoped Path und version="alpha"', () => {
      const path = Reflect.getMetadata('path', EigenschutzVorfallController);
      const version = Reflect.getMetadata('__version__', EigenschutzVorfallController);
      expect(path).toBe('einsaetze/:einsatzId/sicherheit/eigenschutz/vorfaelle');
      expect(version).toBe('alpha');
    });
  });

  describe('POST /vorfaelle (Create)', () => {
    function buildBody(overrides: Record<string, unknown> = {}) {
      return {
        einheitId: EINHEIT_ID,
        was: 'Sturz beim Aufbau',
        wann: NOW.toISOString(),
        vorfallZeit: NOW.toISOString(),
        wo: null,
        beteiligte: [],
        massnahmen: 'Erstversorgung',
        unfallkasseRelevant: true,
        ...overrides,
      } as never;
    }

    it('(4) Erfolg: Command wird gebaut, findById liefert Aggregate, DTO zurück', async () => {
      const aggregate = buildAggregate();
      commandBus.execute.mockResolvedValue(Result.ok(aggregate.id.value));
      vorfallRepo.findById.mockResolvedValue(Result.ok(aggregate));

      const dto = await controller.reportVorfall(EINSATZ_ID, buildBody(), { userId: USER_ID } as never);

      expect(dto.id).toBe(aggregate.id.value);
      expect(dto.einsatzId).toBe(EINSATZ_ID);
      expect(dto.unfallkasseRelevant).toBe(true);
      // Story 5.2: kontextSnapshot ist V1-Shape, nicht mehr Empty.
      expect((dto.kontextSnapshot as { schemaVersion: number }).schemaVersion).toBe(1);

      const cmd = commandBus.execute.mock.calls[0]?.[0] as ReportVorfallCommand;
      expect(cmd).toBeInstanceOf(ReportVorfallCommand);
      expect(cmd.einsatzId).toBe(EINSATZ_ID);
      expect(cmd.einheitId).toBe(EINHEIT_ID);
      expect(cmd.erfasstVonUserId).toBe(USER_ID);
      expect(cmd.unfallkasseRelevant).toBe(true);
    });

    it('(5) ValidationFailed:Wo:* → 422 mit context.field="wo"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ValidationFailed:Wo:longitude muss zwischen -180 und 180 liegen'));

      try {
        await controller.reportVorfall(EINSATZ_ID, buildBody({ wo: { kind: 'coordinate', longitude: 999, latitude: 0 } }), { userId: USER_ID } as never);
        fail('expected UnprocessableEntityException');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string; field: string } };
        expect(response.context.rule).toBe('ValidationFailed');
        expect(response.context.field).toBe('wo');
      }
    });

    it('(6) ValidationFailed:Beteiligter:idx=2:* → 422 mit context.field="beteiligte" + index', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ValidationFailed:Beteiligter:idx=2:userId muss eine CUID2 sein'));

      try {
        await controller.reportVorfall(EINSATZ_ID, buildBody(), { userId: USER_ID } as never);
        fail('expected UnprocessableEntityException');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string; field: string; index: number } };
        expect(response.context.rule).toBe('ValidationFailed');
        expect(response.context.field).toBe('beteiligte');
        expect(response.context.index).toBe(2);
      }
    });

    it('(7) ValidationFailed:Aggregate:* → 422 mit context.layer="aggregate"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ValidationFailed:Aggregate:was darf maximal 80 Zeichen haben'));

      try {
        await controller.reportVorfall(EINSATZ_ID, buildBody(), { userId: USER_ID } as never);
        fail('expected UnprocessableEntityException');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string; layer: string } };
        expect(response.context.rule).toBe('ValidationFailed');
        expect(response.context.layer).toBe('aggregate');
      }
    });

    it('(8) BusinessRule:WallclockDriftTooLarge → 422 mit context.rule = Sentinel-Name', async () => {
      // Handler darf BusinessRule:* NICHT als ValidationFailed:Aggregate:* wrappen
      // (AC7-Vertrag: Sentinel-Name muss im rule-Feld der Response erscheinen).
      commandBus.execute.mockResolvedValue(Result.fail<string>('BusinessRule:WallclockDriftTooLarge'));

      try {
        await controller.reportVorfall(EINSATZ_ID, buildBody(), { userId: USER_ID } as never);
        fail('expected UnprocessableEntityException');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(response.context.rule).toBe('WallclockDriftTooLarge');
      }
    });

    it('(9) InfrastructureError:* → 500', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('InfrastructureError:DB-Down'));

      await expect(controller.reportVorfall(EINSATZ_ID, buildBody(), { userId: USER_ID } as never)).rejects.toBeInstanceOf(InternalServerErrorException);
    });

    it('(10) Cross-Einsatz-Defense: findById liefert anderen einsatzId → 403 ForbiddenException (AC8)', async () => {
      const aggregate = buildAggregate();
      commandBus.execute.mockResolvedValue(Result.ok(aggregate.id.value));
      vorfallRepo.findById.mockResolvedValue(Result.ok(aggregate));

      try {
        await controller.reportVorfall('clw3h8x9y0000qwertyui05098', buildBody(), { userId: USER_ID } as never);
        fail('expected ForbiddenException');
      } catch (e) {
        expect(e).toBeInstanceOf(ForbiddenException);
        const response = (e as ForbiddenException).getResponse() as { context: { rule: string } };
        expect(response.context.rule).toBe('CrossEinsatz');
      }
    });

    it('(13) findById Result.fail nach erfolgreichem Insert → 500 (NICHT 404, sonst Duplikate via Retry)', async () => {
      const aggregate = buildAggregate();
      commandBus.execute.mockResolvedValue(Result.ok(aggregate.id.value));
      vorfallRepo.findById.mockResolvedValue(Result.fail<EigenschutzVorfall | null>('DB-Connection lost'));

      await expect(controller.reportVorfall(EINSATZ_ID, buildBody(), { userId: USER_ID } as never)).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  // Story 5.2 AC10 — GET-Endpoint
  describe('GET /vorfaelle/:vorfallId (Story 5.2 AC10)', () => {
    it('(15) Erfolg: Query liefert Aggregate, DTO mit Snapshot wird zurückgegeben', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));

      const dto = await controller.getVorfall(EINSATZ_ID, aggregate.id.value);

      expect(dto.id).toBe(aggregate.id.value);
      expect(dto.einsatzId).toBe(EINSATZ_ID);
      expect((dto.kontextSnapshot as { schemaVersion: number }).schemaVersion).toBe(1);
    });

    it('(16) NotFound:Vorfall → 404', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<EigenschutzVorfall>('NotFound:Vorfall'));

      await expect(controller.getVorfall(EINSATZ_ID, 'cl9vorfallnotfound012345x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('(17) Cross-Einsatz wird vom Handler als NotFound:Vorfall signalisiert (kein Existenz-Leak) → 404', async () => {
      // Der Query-Handler (GetVorfallByIdHandler) liefert NotFound:Vorfall auch
      // bei Cross-Einsatz. Der Controller mappt das auf 404 — symmetrisch zur
      // GetSicherungsposten-Logik (Story 4.4).
      queryBus.execute.mockResolvedValue(Result.fail<EigenschutzVorfall>('NotFound:Vorfall'));

      await expect(controller.getVorfall('cl9einsatzfremd1234567890', 'cl9vorfall12345678901234x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('(18) InfrastructureError:ReconstituteEigenschutzVorfall:KontextSnapshotCorrupt → 500 mit rule-Surfacing', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<EigenschutzVorfall>('InfrastructureError:ReconstituteEigenschutzVorfall:KontextSnapshotCorrupt:NotAnObject'));

      try {
        await controller.getVorfall(EINSATZ_ID, 'cl9vorfall12345678901234x');
        fail('expected InternalServerErrorException');
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        const response = (e as InternalServerErrorException).getResponse() as { context: { rule: string; layer: string } };
        expect(response.context.rule).toBe('KontextSnapshotCorrupt');
        expect(response.context.layer).toBe('infrastructure');
      }
    });

    it('(18b) Production-Sentinel-Chain mit nested InfrastructureError-Prefix → rule=KontextSnapshotCorrupt', async () => {
      // Code-Review-Patch: Der Mapper liefert seinerseits einen vollständigen
      // `InfrastructureError:KontextSnapshotCorrupt:<reason>`-Sentinel, das Repo
      // wrappt das in `InfrastructureError:ReconstituteEigenschutzVorfall:`.
      // Ergebnis ist eine doppel-prefixierte Kette — die Regex muss das
      // optionale nested `InfrastructureError:` skippen.
      queryBus.execute.mockResolvedValue(Result.fail<EigenschutzVorfall>('InfrastructureError:ReconstituteEigenschutzVorfall:InfrastructureError:KontextSnapshotCorrupt:NotAnObject'));

      try {
        await controller.getVorfall(EINSATZ_ID, 'cl9vorfall12345678901234x');
        fail('expected InternalServerErrorException');
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        const response = (e as InternalServerErrorException).getResponse() as { context: { rule: string; layer: string } };
        expect(response.context.rule).toBe('KontextSnapshotCorrupt');
        expect(response.context.layer).toBe('infrastructure');
      }
    });
  });

  describe('GET /vorfaelle/:vorfallId/audit-timeline (Story 5.6)', () => {
    it('(A2) Happy Path: Query wird gebaut und DTO-Dates werden ISO-Strings', async () => {
      queryBus.execute.mockResolvedValue(
        Result.ok({
          eintraege: [
            {
              id: 'evt-1',
              type: 'exported',
              occurredAt: NOW,
              userId: USER_ID,
              userName: 'Rubeen',
              format: 'pdf',
              label: 'Export durch Rubeen als PDF',
            },
          ],
        }),
      );

      const dto = await controller.getVorfallAuditTimeline(EINSATZ_ID, 'clw3h8x9y0000qwertyui05010');

      const query = queryBus.execute.mock.calls[0][0] as GetVorfallAuditTimelineQuery;
      expect(query).toBeInstanceOf(GetVorfallAuditTimelineQuery);
      expect(query.einsatzId).toBe(EINSATZ_ID);
      expect(dto.eintraege).toHaveLength(1);
      expect(dto.eintraege[0].occurredAt).toBe(NOW.toISOString());
      expect(dto.eintraege[0].format).toBe('pdf');
    });

    it('(A3) NotFound:Vorfall → 404', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('NotFound:Vorfall'));
      await expect(controller.getVorfallAuditTimeline(EINSATZ_ID, 'cl9vorfallnotfound012345x')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('(A4) InfrastructureError:* → 500', async () => {
      queryBus.execute.mockResolvedValue(Result.fail('InfrastructureError:VorfallAuditTimeline:Outbox:Timeout'));
      await expect(controller.getVorfallAuditTimeline(EINSATZ_ID, 'clw3h8x9y0000qwertyui05010')).rejects.toBeInstanceOf(InternalServerErrorException);
    });
  });

  describe('GET /vorfaelle (List, Story 5.3 AC8 + AC13)', () => {
    function buildRow(overrides: Partial<VorfallListReadRow> = {}): VorfallListReadRow {
      return {
        id: overrides.id ?? 'clw3h8x9y0000qwertyui05101',
        einsatzId: overrides.einsatzId ?? EINSATZ_ID,
        einheitId: overrides.einheitId ?? EINHEIT_ID,
        vorfallZeit: overrides.vorfallZeit ?? NOW,
        was: overrides.was ?? 'Sturz beim Aufbau',
        unfallkasseRelevant: overrides.unfallkasseRelevant ?? true,
        erfasstAm: overrides.erfasstAm ?? NOW,
        erfasstVonUserId: overrides.erfasstVonUserId ?? USER_ID,
        status: overrides.status ?? 'OFFEN',
        geschlossenAm: overrides.geschlossenAm === undefined ? null : overrides.geschlossenAm,
        geschlossenVonUserId: overrides.geschlossenVonUserId === undefined ? null : overrides.geschlossenVonUserId,
      };
    }

    it('(L2) Happy-200: liefert Liste, sendet Query mit getrimmtem Filter und User-ID', async () => {
      const rows = [buildRow({ id: 'a' }), buildRow({ id: 'b', unfallkasseRelevant: false })];
      queryBus.execute.mockResolvedValue(Result.ok<VorfallListReadRow[]>(rows));

      const result = await controller.listVorfaelle(
        EINSATZ_ID,
        { einheitIds: [EINHEIT_ID], vorfallZeitVon: '2026-05-01T00:00:00.000Z', vorfallZeitBis: '2026-05-08T00:00:00.000Z', unfallkasseRelevant: true } as never,
        { userId: USER_ID } as never,
      );

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('a');
      expect(result[0].vorfallZeit).toBe(NOW.toISOString());
      const query = queryBus.execute.mock.calls[0][0] as ListVorfaelleQuery;
      expect(query).toBeInstanceOf(ListVorfaelleQuery);
      expect(query.einsatzId).toBe(EINSATZ_ID);
      expect(query.callerUserId).toBe(USER_ID);
      expect(query.filter.einheitIds).toEqual([EINHEIT_ID]);
      expect(query.filter.vorfallZeitVon).toEqual(new Date('2026-05-01T00:00:00.000Z'));
      expect(query.filter.vorfallZeitBis).toEqual(new Date('2026-05-08T00:00:00.000Z'));
      expect(query.filter.unfallkasseRelevant).toBe(true);
    });

    it('(L3) ValidationFailed:VorfallListFilter:* → 400 BadRequest mit rule + filter-Suffix', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<VorfallListReadRow[]>('ValidationFailed:VorfallListFilter:EinheitIdsCap'));

      try {
        await controller.listVorfaelle(EINSATZ_ID, {} as never, { userId: USER_ID } as never);
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse() as { message: string; context: { rule: string; filter: string } };
        expect(response.message).toBe('ValidationFailed:VorfallListFilter:EinheitIdsCap');
        expect(response.context.rule).toBe('ValidationFailed');
        expect(response.context.filter).toBe('EinheitIdsCap');
      }
    });

    it('(L4) InfrastructureError:* → 500 mit layer="infrastructure"', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<VorfallListReadRow[]>('InfrastructureError:ListEigenschutzVorfaelle:Timeout'));

      try {
        await controller.listVorfaelle(EINSATZ_ID, {} as never, { userId: USER_ID } as never);
        fail('expected InternalServerErrorException');
      } catch (e) {
        expect(e).toBeInstanceOf(InternalServerErrorException);
        const response = (e as InternalServerErrorException).getResponse() as { context: { layer: string } };
        expect(response.context.layer).toBe('infrastructure');
      }
    });

    it('(L5) Filter unfallkasseRelevant=true wird via Query nur passende Rows liefern (Caller-Mock-Smoke)', async () => {
      // Wir verifizieren hier den Pass-Through, nicht das Repo. Der Mock
      // antwortet mit nur UK-relevanten Rows, der Controller mappt sie zu
      // DTOs ohne Filter-Eigenleistung.
      queryBus.execute.mockResolvedValue(Result.ok<VorfallListReadRow[]>([buildRow({ unfallkasseRelevant: true })]));

      const result = await controller.listVorfaelle(EINSATZ_ID, { unfallkasseRelevant: true } as never, { userId: USER_ID } as never);

      expect(result).toHaveLength(1);
      expect(result[0].unfallkasseRelevant).toBe(true);
      const query = queryBus.execute.mock.calls[0][0] as ListVorfaelleQuery;
      expect(query.filter.unfallkasseRelevant).toBe(true);
      expect(query.filter.einheitIds).toBeUndefined();
    });

    it('(L6) leere Filter (alle undefined) → Query.filter ist leeres Objekt, kein Pass-Through', async () => {
      queryBus.execute.mockResolvedValue(Result.ok<VorfallListReadRow[]>([]));

      const result = await controller.listVorfaelle(EINSATZ_ID, {} as never, { userId: USER_ID } as never);

      expect(result).toEqual([]);
      const query = queryBus.execute.mock.calls[0][0] as ListVorfaelleQuery;
      expect(query.filter).toEqual({});
    });
  });

  // Story 5.4 — PDF-Export
  describe('GET /vorfaelle/:vorfallId/export (Story 5.4)', () => {
    const VORFALL_ID = 'clw3h8x9y0000qwertyui05010';

    function buildResponseMock() {
      const headers: Record<string, string> = {};
      const res = {
        setHeader: jest.fn((key: string, value: string) => {
          headers[key.toLowerCase()] = value;
        }),
        send: jest.fn(),
        getHeaders: () => headers,
      };
      return { res, headers };
    }

    it('(E2-a) NotFound:Vorfall (existiert nicht) → 404', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<EigenschutzVorfall>('NotFound:Vorfall'));
      const { res } = buildResponseMock();
      await expect(controller.exportVorfall(EINSATZ_ID, 'cl9vorfallnotfound012345x', undefined, { userId: USER_ID } as never, res as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('(E2-b) Cross-Einsatz Vorfall → Handler liefert NotFound:Vorfall → 404 (kein Existenz-Leak)', async () => {
      queryBus.execute.mockResolvedValue(Result.fail<EigenschutzVorfall>('NotFound:Vorfall'));
      const { res } = buildResponseMock();
      await expect(controller.exportVorfall('cl9einsatzfremd1234567890', VORFALL_ID, undefined, { userId: USER_ID } as never, res as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('(E2-c) Erfolg: 200 + application/pdf + Buffer-Body', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));
      commandBus.execute.mockResolvedValue(Result.ok('audit-event-id'));
      const { res, headers } = buildResponseMock();

      await controller.exportVorfall(EINSATZ_ID, aggregate.id.value, undefined, { userId: USER_ID } as never, res as never);

      expect(pdfRenderer.generate).toHaveBeenCalledTimes(1);
      const generateArg = pdfRenderer.generate.mock.calls[0][0];
      expect(generateArg.vorfall).toBe(aggregate);
      expect(generateArg.erzeugtVonUserId).toBe(USER_ID);
      expect(generateArg.erzeugtAm).toBeInstanceOf(Date);
      const auditCommand = commandBus.execute.mock.calls[0][0] as AuditVorfallExportCommand;
      expect(auditCommand).toBeInstanceOf(AuditVorfallExportCommand);
      expect(auditCommand.einsatzId).toBe(EINSATZ_ID);
      expect(auditCommand.vorfallId).toBe(aggregate.id.value);
      expect(auditCommand.exportedByUserId).toBe(USER_ID);
      expect(auditCommand.format).toBe('pdf');
      expect(auditCommand.downloadedAt).toBe(generateArg.erzeugtAm);

      expect(headers['content-type']).toBe('application/pdf');
      expect(headers['content-disposition']).toMatch(new RegExp(`^attachment; filename="vorfall-${aggregate.id.value}-\\d{8}-\\d{4}\\.pdf"$`));
      expect(headers['content-length']).toBeDefined();
      expect(res.send).toHaveBeenCalledTimes(1);
      const buf = res.send.mock.calls[0][0] as Buffer;
      expect(Buffer.isBuffer(buf)).toBe(true);
      expect(buf.subarray(0, 4).toString()).toBe('%PDF');
    });

    it('(E2-d-json) format=json → 200 + application/json + Buffer-Body (Story 5.5)', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));
      commandBus.execute.mockResolvedValue(Result.ok('audit-event-id'));
      const { res, headers } = buildResponseMock();

      await controller.exportVorfall(EINSATZ_ID, aggregate.id.value, 'json', { userId: USER_ID } as never, res as never);

      expect(jsonRenderer.generate).toHaveBeenCalledTimes(1);
      const generateArg = jsonRenderer.generate.mock.calls[0][0];
      expect(generateArg.vorfall).toBe(aggregate);
      expect(generateArg.erzeugtVonUserId).toBe(USER_ID);
      expect(generateArg.erzeugtAm).toBeInstanceOf(Date);
      const auditCommand = commandBus.execute.mock.calls[0][0] as AuditVorfallExportCommand;
      expect(auditCommand).toBeInstanceOf(AuditVorfallExportCommand);
      expect(auditCommand.format).toBe('json');
      expect(auditCommand.downloadedAt).toBe(generateArg.erzeugtAm);

      expect(headers['content-type']).toBe('application/json; charset=utf-8');
      expect(headers['content-disposition']).toMatch(new RegExp(`^attachment; filename="vorfall-${aggregate.id.value}-\\d{8}-\\d{4}\\.json"$`));
      expect(headers['content-length']).toBeDefined();
      expect(headers['cache-control']).toBe('no-store, private');
      expect(res.send).toHaveBeenCalledTimes(1);
      expect(pdfRenderer.generate).not.toHaveBeenCalled();
    });

    it('(E2-d-invalid) format=xml → 400 mit notSupported-Sentinel (Sentinel-Pfad bleibt lebendig)', async () => {
      const { res } = buildResponseMock();
      try {
        await controller.exportVorfall(EINSATZ_ID, VORFALL_ID, 'xml', { userId: USER_ID } as never, res as never);
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const response = (e as BadRequestException).getResponse() as { message: string; context: { rule: string; filter: string } };
        expect(response.message).toBe('ValidationFailed:VorfallExport:format=xml:notSupported');
        expect(response.context.rule).toBe('ValidationFailed');
        expect(response.context.filter).toBe('format=xml');
      }
      expect(pdfRenderer.generate).not.toHaveBeenCalled();
      expect(jsonRenderer.generate).not.toHaveBeenCalled();
      expect(commandBus.execute).not.toHaveBeenCalled();
    });

    it('(E2-e) format=pdf (explizit) → 200', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));
      commandBus.execute.mockResolvedValue(Result.ok('audit-event-id'));
      const { res } = buildResponseMock();
      await controller.exportVorfall(EINSATZ_ID, aggregate.id.value, 'pdf', { userId: USER_ID } as never, res as never);
      expect(pdfRenderer.generate).toHaveBeenCalledTimes(1);
      expect(commandBus.execute).toHaveBeenCalledWith(expect.any(AuditVorfallExportCommand));
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it('(E2-f) format weggelassen → Default pdf → 200', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));
      commandBus.execute.mockResolvedValue(Result.ok('audit-event-id'));
      const { res } = buildResponseMock();
      await controller.exportVorfall(EINSATZ_ID, aggregate.id.value, undefined, { userId: USER_ID } as never, res as never);
      expect(pdfRenderer.generate).toHaveBeenCalledTimes(1);
      expect(res.send).toHaveBeenCalledTimes(1);
    });

    it('(E4) Renderer-Throw: kein Audit-Command und keine Response-Headers', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));
      pdfRenderer.generate.mockRejectedValue(new Error('Render failed'));
      const { res } = buildResponseMock();

      await expect(controller.exportVorfall(EINSATZ_ID, aggregate.id.value, 'pdf', { userId: USER_ID } as never, res as never)).rejects.toThrow('Render failed');

      expect(commandBus.execute).not.toHaveBeenCalled();
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });

    it('(E5) Audit-Command-Failure: kein Download wird ausgeliefert', async () => {
      const aggregate = buildAggregate();
      queryBus.execute.mockResolvedValue(Result.ok(aggregate));
      commandBus.execute.mockResolvedValue(Result.fail('InfrastructureError:AuditDown'));
      const { res } = buildResponseMock();

      await expect(controller.exportVorfall(EINSATZ_ID, aggregate.id.value, 'pdf', { userId: USER_ID } as never, res as never)).rejects.toBeInstanceOf(InternalServerErrorException);

      expect(pdfRenderer.generate).toHaveBeenCalledTimes(1);
      expect(res.setHeader).not.toHaveBeenCalled();
      expect(res.send).not.toHaveBeenCalled();
    });
  });

  describe('POST /vorfaelle/:vorfallId/schliessen (Issue #415)', () => {
    it('Erfolg: leitet Command durch und liefert geschlossenen DTO zurück', async () => {
      const aggregate = buildAggregate();
      aggregate.close(USER_ID, 'Abgearbeitet');
      commandBus.execute.mockResolvedValue(Result.ok(aggregate.id.value));
      vorfallRepo.findById.mockResolvedValue(Result.ok(aggregate));

      const dto = await controller.closeVorfall(EINSATZ_ID, aggregate.id.value, { begruendung: 'Abgearbeitet' } as never, { userId: USER_ID } as never);

      expect(dto.id).toBe(aggregate.id.value);
      expect(dto.status).toBe('GESCHLOSSEN');
      expect(dto.schliessungsBegruendung).toBe('Abgearbeitet');
      const cmd = commandBus.execute.mock.calls[0]?.[0] as { vorfallId: string; einsatzId: string; userId: string; begruendung: string | null };
      expect(cmd.vorfallId).toBe(aggregate.id.value);
      expect(cmd.einsatzId).toBe(EINSATZ_ID);
      expect(cmd.userId).toBe(USER_ID);
      expect(cmd.begruendung).toBe('Abgearbeitet');
    });

    it('Erfolg ohne Begründung — `begruendung=null` an Command durchgereicht', async () => {
      const aggregate = buildAggregate();
      aggregate.close(USER_ID);
      commandBus.execute.mockResolvedValue(Result.ok(aggregate.id.value));
      vorfallRepo.findById.mockResolvedValue(Result.ok(aggregate));

      await controller.closeVorfall(EINSATZ_ID, aggregate.id.value, {} as never, { userId: USER_ID } as never);

      const cmd = commandBus.execute.mock.calls[0]?.[0] as { begruendung: string | null };
      expect(cmd.begruendung).toBeNull();
    });

    it('BusinessRule:VorfallBereitsGeschlossen → 422 mit rule="VorfallBereitsGeschlossen"', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('BusinessRule:VorfallBereitsGeschlossen'));

      try {
        await controller.closeVorfall(EINSATZ_ID, 'fake', { begruendung: 'x' } as never, { userId: USER_ID } as never);
        fail('expected UnprocessableEntityException');
      } catch (e) {
        expect(e).toBeInstanceOf(UnprocessableEntityException);
        const response = (e as UnprocessableEntityException).getResponse() as { context: { rule: string } };
        expect(response.context.rule).toBe('VorfallBereitsGeschlossen');
      }
    });

    it('NotFound:Vorfall → 404', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('NotFound:Vorfall'));

      await expect(controller.closeVorfall(EINSATZ_ID, 'fake', {} as never, { userId: USER_ID } as never)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('ValidationFailed:Begruendung → 422', async () => {
      commandBus.execute.mockResolvedValue(Result.fail<string>('ValidationFailed:Begruendung'));

      await expect(controller.closeVorfall(EINSATZ_ID, 'fake', { begruendung: 'a'.repeat(501) } as never, { userId: USER_ID } as never)).rejects.toBeInstanceOf(UnprocessableEntityException);
    });
  });
});
