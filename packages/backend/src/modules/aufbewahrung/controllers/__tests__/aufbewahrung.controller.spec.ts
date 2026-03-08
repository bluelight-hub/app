// @ts-nocheck
import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AufbewahrungController } from '../aufbewahrung.controller';
import { UpdateAufbewahrungsKonfigurationHandler } from '@/application/aufbewahrung/commands/update-aufbewahrungs-konfiguration/update-aufbewahrungs-konfiguration.handler';
import { GetAufbewahrungsKonfigurationQueryHandler } from '@/application/aufbewahrung/queries/get-aufbewahrungs-konfiguration/get-aufbewahrungs-konfiguration.handler';
import { GetAufbewahrungsVorschauQueryHandler } from '@/application/aufbewahrung/queries/get-aufbewahrungs-vorschau/get-aufbewahrungs-vorschau.handler';
import { GetComplianceReportsQueryHandler } from '@/application/aufbewahrung/queries/get-compliance-reports/get-compliance-reports.handler';
import { AufbewahrungsKonfigurationDto } from '@/application/aufbewahrung/dto/aufbewahrungs-konfiguration.dto';
import { AufbewahrungsVorschauDto } from '@/application/aufbewahrung/dto/aufbewahrungs-vorschau.dto';
import { ComplianceReportDto } from '@/application/aufbewahrung/dto/compliance-report.dto';
import { Result } from '@domain/common/result';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';

describe('AufbewahrungController', () => {
  let controller: AufbewahrungController;
  let updateHandler: jest.Mocked<UpdateAufbewahrungsKonfigurationHandler>;
  let getKonfigHandler: jest.Mocked<GetAufbewahrungsKonfigurationQueryHandler>;
  let getVorschauHandler: jest.Mocked<GetAufbewahrungsVorschauQueryHandler>;
  let getReportsHandler: jest.Mocked<GetComplianceReportsQueryHandler>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AufbewahrungController],
      providers: [
        {
          provide: UpdateAufbewahrungsKonfigurationHandler,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAufbewahrungsKonfigurationQueryHandler,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetAufbewahrungsVorschauQueryHandler,
          useValue: { execute: jest.fn() },
        },
        {
          provide: GetComplianceReportsQueryHandler,
          useValue: { execute: jest.fn() },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AufbewahrungController>(AufbewahrungController);
    updateHandler = module.get(UpdateAufbewahrungsKonfigurationHandler);
    getKonfigHandler = module.get(GetAufbewahrungsKonfigurationQueryHandler);
    getVorschauHandler = module.get(GetAufbewahrungsVorschauQueryHandler);
    getReportsHandler = module.get(GetComplianceReportsQueryHandler);
  });

  describe('getConfig', () => {
    it('sollte die aktuelle Konfiguration zurueckgeben', async () => {
      const dto = new AufbewahrungsKonfigurationDto();
      dto.aufbewahrungsfristJahre = 10;
      dto.freigabeperiodeTage = 30;
      dto.automatischLoeschenAktiv = false;

      getKonfigHandler.execute.mockResolvedValue(Result.ok(dto));

      const result = await controller.getConfig();

      expect(result).toEqual(dto);
      expect(getKonfigHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('sollte InternalServerErrorException werfen bei Fehler', async () => {
      getKonfigHandler.execute.mockResolvedValue(Result.fail('DB-Fehler'));

      await expect(controller.getConfig()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('updateConfig', () => {
    const user = { id: 'user-1' };
    const dto = {
      aufbewahrungsfristJahre: 15,
      freigabeperiodeTage: 60,
      automatischLoeschenAktiv: true,
    };

    it('sollte die Konfiguration aktualisieren und neue Konfiguration zurueckgeben', async () => {
      const updatedKonfig = new AufbewahrungsKonfigurationDto();
      updatedKonfig.aufbewahrungsfristJahre = 15;
      updatedKonfig.freigabeperiodeTage = 60;
      updatedKonfig.automatischLoeschenAktiv = true;

      updateHandler.execute.mockResolvedValue(Result.ok(undefined));
      getKonfigHandler.execute.mockResolvedValue(Result.ok(updatedKonfig));

      const result = await controller.updateConfig(dto, user);

      expect(result).toEqual(updatedKonfig);
      expect(updateHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('sollte BadRequestException werfen bei ungültiger Konfiguration', async () => {
      updateHandler.execute.mockResolvedValue(Result.fail('Ungültige Frist'));

      await expect(controller.updateConfig(dto, user)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getVorschau', () => {
    it('sollte die Vorschau zurueckgeben', async () => {
      const vorschau = new AufbewahrungsVorschauDto();
      vorschau.einsaetze = [];
      vorschau.gesamtBefehlCount = 0;

      getVorschauHandler.execute.mockResolvedValue(Result.ok(vorschau));

      const result = await controller.getVorschau();

      expect(result).toEqual(vorschau);
      expect(getVorschauHandler.execute).toHaveBeenCalledTimes(1);
    });

    it('sollte InternalServerErrorException werfen bei Fehler', async () => {
      getVorschauHandler.execute.mockResolvedValue(Result.fail('Query-Fehler'));

      await expect(controller.getVorschau()).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getReports', () => {
    it('sollte alle Reports zurueckgeben ohne Filter', async () => {
      const report = new ComplianceReportDto();
      report.id = 'report-1';
      report.einsatzId = 'einsatz-1';
      report.typ = 'ANONYMISIERUNG';
      report.befehlCount = 5;
      report.empfaengerCount = 10;
      report.kommentarCount = 3;
      report.durchgefuehrtAm = new Date();
      report.durchgefuehrtVon = 'SYSTEM';

      getReportsHandler.execute.mockResolvedValue(Result.ok([report]));

      const result = await controller.getReports();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(report);
    });

    it('sollte Reports nach Einsatz filtern', async () => {
      getReportsHandler.execute.mockResolvedValue(Result.ok([]));

      await controller.getReports('einsatz-123');

      expect(getReportsHandler.execute).toHaveBeenCalledWith(expect.objectContaining({ einsatzId: 'einsatz-123' }));
    });

    it('sollte InternalServerErrorException werfen bei Fehler', async () => {
      getReportsHandler.execute.mockResolvedValue(Result.fail('Report-Fehler'));

      await expect(controller.getReports()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
