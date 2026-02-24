import { Body, Controller, Get, InternalServerErrorException, Put, Query, BadRequestException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { UserRole } from '@/generated/prisma/client';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { UpdateAufbewahrungsKonfigurationHandler } from '@/application/aufbewahrung/commands/update-aufbewahrungs-konfiguration/update-aufbewahrungs-konfiguration.handler';
import { UpdateAufbewahrungsKonfigurationCommand } from '@/application/aufbewahrung/commands/update-aufbewahrungs-konfiguration/update-aufbewahrungs-konfiguration.command';
import { GetAufbewahrungsKonfigurationQueryHandler } from '@/application/aufbewahrung/queries/get-aufbewahrungs-konfiguration/get-aufbewahrungs-konfiguration.handler';
import { GetAufbewahrungsKonfigurationQuery } from '@/application/aufbewahrung/queries/get-aufbewahrungs-konfiguration/get-aufbewahrungs-konfiguration.query';
import { GetAufbewahrungsVorschauQueryHandler } from '@/application/aufbewahrung/queries/get-aufbewahrungs-vorschau/get-aufbewahrungs-vorschau.handler';
import { GetAufbewahrungsVorschauQuery } from '@/application/aufbewahrung/queries/get-aufbewahrungs-vorschau/get-aufbewahrungs-vorschau.query';
import { GetComplianceReportsQueryHandler } from '@/application/aufbewahrung/queries/get-compliance-reports/get-compliance-reports.handler';
import { GetComplianceReportsQuery } from '@/application/aufbewahrung/queries/get-compliance-reports/get-compliance-reports.query';
import { AufbewahrungsKonfigurationDto } from '@/application/aufbewahrung/dto/aufbewahrungs-konfiguration.dto';
import { UpdateAufbewahrungsKonfigurationDto } from '@/application/aufbewahrung/dto/update-aufbewahrungs-konfiguration.dto';
import { AufbewahrungsVorschauDto } from '@/application/aufbewahrung/dto/aufbewahrungs-vorschau.dto';
import { ComplianceReportDto } from '@/application/aufbewahrung/dto/compliance-report.dto';

/**
 * Controller fuer DSGVO-Aufbewahrungsmanagement.
 *
 * Thin HTTP Adapter: Mappt HTTP-Requests zu Queries/Commands und
 * Domain-Ergebnisse zurueck auf HTTP-Responses.
 *
 * **Endpoints:**
 * - GET /api/v-alpha/aufbewahrung/config — Aktuelle Konfiguration abrufen
 * - PUT /api/v-alpha/aufbewahrung/config — Konfiguration aktualisieren
 * - GET /api/v-alpha/aufbewahrung/vorschau — Vorschau betroffener Einsaetze
 * - GET /api/v-alpha/aufbewahrung/reports — Compliance-Reports abrufen
 *
 * @remarks Story 5.5
 */
@ApiTags('Aufbewahrung')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungueltig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung – nur ADMIN oder SUPER_ADMIN' })
@Controller({
  path: 'aufbewahrung',
  version: 'alpha',
})
export class AufbewahrungController {
  constructor(
    private readonly updateKonfigurationHandler: UpdateAufbewahrungsKonfigurationHandler,
    private readonly getKonfigurationHandler: GetAufbewahrungsKonfigurationQueryHandler,
    private readonly getVorschauHandler: GetAufbewahrungsVorschauQueryHandler,
    private readonly getReportsHandler: GetComplianceReportsQueryHandler,
  ) {}

  /**
   * GET /api/v-alpha/aufbewahrung/config
   * Gibt die aktuelle Aufbewahrungskonfiguration zurueck.
   */
  @Get('config')
  @ApiOperation({ summary: 'Aktuelle Aufbewahrungskonfiguration abrufen' })
  @ApiWrappedResponse(AufbewahrungsKonfigurationDto, { description: 'Aktuelle DSGVO-Aufbewahrungskonfiguration' })
  async getConfig(): Promise<AufbewahrungsKonfigurationDto> {
    const result = await this.getKonfigurationHandler.execute(new GetAufbewahrungsKonfigurationQuery());

    if (result.isFailure) {
      throw new InternalServerErrorException(result.error);
    }

    return result.value as AufbewahrungsKonfigurationDto;
  }

  /**
   * PUT /api/v-alpha/aufbewahrung/config
   * Aktualisiert die Aufbewahrungskonfiguration.
   */
  @Put('config')
  @ApiOperation({ summary: 'Aufbewahrungskonfiguration aktualisieren' })
  @ApiWrappedResponse(AufbewahrungsKonfigurationDto, { description: 'Aktualisierte Konfiguration' })
  async updateConfig(@Body() dto: UpdateAufbewahrungsKonfigurationDto, @CurrentUser() user: { id: string }): Promise<AufbewahrungsKonfigurationDto> {
    const command = new UpdateAufbewahrungsKonfigurationCommand(dto.aufbewahrungsfristJahre, dto.freigabeperiodeTage, dto.automatischLoeschenAktiv, user.id);

    const updateResult = await this.updateKonfigurationHandler.execute(command);
    if (updateResult.isFailure) {
      throw new BadRequestException(updateResult.error);
    }

    // Nach Update die neue Konfiguration zurueckladen
    const getResult = await this.getKonfigurationHandler.execute(new GetAufbewahrungsKonfigurationQuery());
    if (getResult.isFailure) {
      throw new InternalServerErrorException(getResult.error);
    }

    return getResult.value as AufbewahrungsKonfigurationDto;
  }

  /**
   * GET /api/v-alpha/aufbewahrung/vorschau
   * Zeigt welche Einsaetze bei aktueller Konfiguration betroffen waeren.
   */
  @Get('vorschau')
  @ApiOperation({ summary: 'Vorschau betroffener Einsaetze bei aktueller Konfiguration' })
  @ApiWrappedResponse(AufbewahrungsVorschauDto, { description: 'Vorschau der betroffenen Einsaetze' })
  async getVorschau(): Promise<AufbewahrungsVorschauDto> {
    const result = await this.getVorschauHandler.execute(new GetAufbewahrungsVorschauQuery());

    if (result.isFailure) {
      throw new InternalServerErrorException(result.error);
    }

    return result.value as AufbewahrungsVorschauDto;
  }

  /**
   * GET /api/v-alpha/aufbewahrung/reports
   * Ruft Compliance-Reports ab, optional gefiltert nach Einsatz.
   */
  @Get('reports')
  @ApiOperation({ summary: 'Compliance-Reports abrufen' })
  @ApiQuery({ name: 'einsatzId', required: false, description: 'Optionale Einsatz-ID zum Filtern' })
  @ApiWrappedResponse(ComplianceReportDto, { isArray: true, description: 'Liste der Compliance-Reports' })
  async getReports(@Query('einsatzId') einsatzId?: string): Promise<ComplianceReportDto[]> {
    const result = await this.getReportsHandler.execute(new GetComplianceReportsQuery(einsatzId));

    if (result.isFailure) {
      throw new InternalServerErrorException(result.error);
    }

    return result.value as ComplianceReportDto[];
  }
}
