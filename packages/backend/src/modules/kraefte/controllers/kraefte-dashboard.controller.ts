import { Controller, Get, Param, UseGuards, BadRequestException, InternalServerErrorException, Inject } from '@nestjs/common';
import { ParseCuidPipe } from '@/infrastructure/http/pipes/parse-cuid.pipe';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiForbiddenResponse,
  ApiInternalServerErrorResponse,
  ApiTooManyRequestsResponse,
  ApiParam,
} from '@nestjs/swagger';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { ADMIN_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';
import { LOGGER } from '@infrastructure/di-tokens';
import type { ILogger } from '@domain/ports/i-logger.port';

// Handlers
import { GetTaktischeStaerkeHandler } from '@application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.handler';

// Queries
import { GetTaktischeStaerkeQuery } from '@application/kraefte/queries/get-taktische-staerke/get-taktische-staerke.query';

// DTOs
import { TaktischeStaerkeDto } from '@application/kraefte/dto/taktische-staerke.dto';

/**
 * Controller für Kräfte-Dashboard-Daten im Einsatz-Kontext.
 *
 * Stellt aggregierte Kräfte-Informationen bereit:
 * - Taktische Stärke (Führung/Unterführung/Mannschaft/Gesamt)
 *
 * **Story 6.1a - Taktische Stärke-Anzeige:**
 * Berechnet die Kräfte-Verteilung für das Dashboard.
 */
@ApiTags('kraefte-dashboard')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - JWT Token fehlt oder ungültig' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@ApiInternalServerErrorResponse({ description: 'Unerwarteter Serverfehler' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung für diese Operation' })
@Controller({ path: 'einsaetze/:einsatzId/kraefte', version: 'alpha' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class KraefteDashboardController {
  constructor(
    private readonly getTaktischeStaerkeHandler: GetTaktischeStaerkeHandler,
    @Inject(LOGGER) private readonly logger: ILogger,
  ) {}

  /**
   * Taktische Stärke eines Einsatzes abrufen.
   *
   * Berechnet die Kräfte-Verteilung nach Kategorien:
   * - Führung: Einsatzleiter, LNA, OrgL, Zugführer, Ärzte
   * - Unterführung: Gruppenführer, Truppführer
   * - Mannschaft: Alle anderen Helfer
   * - Gesamt: Summe aller Kategorien
   *
   * **AC1:** Korrekte Berechnung (z.B. "3/1/8/12")
   * **AC1b:** Empty State ("0/0/0/0" wenn keine Personen)
   * **AC4:** Funktion > Qualifikation Priorität
   * **AC5:** Ärzte → Führung
   * **NFR5:** <500ms Response Time
   *
   * @param einsatzId - UUID des Einsatzes
   * @returns Taktische Stärke mit Führung/Unterführung/Mannschaft/Gesamt
   */
  @Get('staerke')
  @Throttle({ default: { limit: 60, ttl: 60000 } }) // 60 requests/min für Dashboard
  @ApiOperation({ summary: 'Taktische Stärke eines Einsatzes abrufen' })
  @ApiParam({ name: 'einsatzId', type: String, format: 'cuid', description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(TaktischeStaerkeDto, { description: 'Taktische Stärke (Führung/Unterführung/Mannschaft/Gesamt)' })
  @ApiBadRequestResponse({ description: 'Ungültige Einsatz-ID' })
  async getTaktischeStaerke(@Param('einsatzId', ParseCuidPipe) einsatzId: string): Promise<TaktischeStaerkeDto> {
    // Query erstellen
    const queryResult = GetTaktischeStaerkeQuery.create(einsatzId);
    if (queryResult.isFailure) {
      throw new BadRequestException(queryResult.error);
    }

    const query = queryResult.value;
    if (!query) {
      throw new BadRequestException('Fehler beim Erstellen der Query');
    }

    // Query ausführen
    const result = await this.getTaktischeStaerkeHandler.execute(query);

    if (result.isFailure) {
      this.logger.error(`Fehler beim Berechnen der taktischen Stärke für Einsatz ${einsatzId}: ${result.error}`, 'KraefteDashboardController');
      throw new InternalServerErrorException('Fehler beim Berechnen der taktischen Stärke');
    }

    const staerke = result.value;
    if (!staerke) {
      throw new InternalServerErrorException('Fehler beim Berechnen der taktischen Stärke');
    }

    return staerke;
  }
}
