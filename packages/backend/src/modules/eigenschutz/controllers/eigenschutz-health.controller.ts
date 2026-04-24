import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { EigenschutzHealthDto } from '@/application/eigenschutz/dto/eigenschutz-health.dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

/**
 * Eigenschutz-Modul-Health-Controller (Story 1.6).
 *
 * Der Endpoint ist der Smoke-Test-Einsprungspunkt in das Eigenschutz-Modul:
 * er liefert kein fachliches Ergebnis, sondern nur `{ status: 'ready' }`, um
 * zu beweisen, dass der Nutzer authentifiziert ist und das Modul gemountet
 * ist. Ein eigenes Eigenschutz-Rollenmodell oder ein Einsatz-Rollenbesetzungs-
 * Gate wird hier bewusst nicht simuliert.
 *
 * **Guard-Kette:**
 * ```
 * JwtAuthGuard
 * ```
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ist ungültig' })
@ApiForbiddenResponse({ description: 'Nicht authentifiziert oder Token nicht verwendbar' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })
@UseGuards(JwtAuthGuard)
export class EigenschutzHealthController {
  @Get('health')
  @ApiOperation({ summary: 'Eigenschutz-Modul-Health — signalisiert, dass das Modul für den Einsatz verdrahtet ist' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(EigenschutzHealthDto, {
    description: 'Modul-Status — stets `ready`, solange der Controller gemountet ist.',
  })
  async getHealth(): Promise<EigenschutzHealthDto> {
    return { status: 'ready' };
  }
}
