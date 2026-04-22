import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { EigenschutzHealthDto } from '@/application/eigenschutz/dto/eigenschutz-health.dto';
import { RequiresEigenschutzRolle } from '@/modules/auth/decorators/requires-eigenschutz-rolle.decorator';
import { EigenschutzRolleGuard } from '@/modules/auth/guards/eigenschutz-rolle.guard';
import { EinsatzScopeGuard } from '@/modules/auth/guards/einsatz-scope.guard';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

/**
 * Eigenschutz-Modul-Health-Controller (Story 1.6).
 *
 * Der Endpoint ist der Smoke-Test-Einsprungspunkt in das Eigenschutz-Modul:
 * er liefert kein fachliches Ergebnis, sondern nur `{ status: 'ready' }`, um
 * zu beweisen, dass die komplette Plattform-Kette (JWT → Einsatz-Scope →
 * Eigenschutz-Rolle) für den aktuellen Einsatz durchläuft. Epic 2+ ersetzt
 * den Hook-Konsum durch fachliche Queries (Ampel, Gefährdungsbeurteilung).
 *
 * **Guard-Kette (Architecture §H, verbindlich):**
 * ```
 * JwtAuthGuard → EinsatzScopeGuard → EigenschutzRolleGuard
 * ```
 *
 * **Rollen-Match (OR):** Jede der vier Eigenschutz-Rollen reicht, damit das
 * Frontend die Entry-Page rendern kann — Admins kommen über den
 * Story-1.5-AC4-Bypass durch.
 */
@ApiTags('eigenschutz')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — JWT fehlt oder ist ungültig' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung (Einsatz-Scope oder Eigenschutz-Rolle fehlt)' })
@Controller({ path: 'einsaetze/:einsatzId/sicherheit/eigenschutz', version: 'alpha' })
@UseGuards(JwtAuthGuard, EinsatzScopeGuard, EigenschutzRolleGuard)
export class EigenschutzHealthController {
  @Get('health')
  @RequiresEigenschutzRolle('Sicherheitsbeauftragter', 'Abschnittsleiter', 'Einheitsführer', 'Nachbereitung')
  @ApiOperation({ summary: 'Eigenschutz-Modul-Health — signalisiert, dass das Modul für den Einsatz verdrahtet ist' })
  @ApiParam({ name: 'einsatzId', type: String, description: 'Einsatz-ID (CUID)' })
  @ApiWrappedResponse(EigenschutzHealthDto, {
    description: 'Modul-Status — stets `ready`, solange der Controller gemountet ist und die Guard-Kette durchläuft.',
  })
  async getHealth(): Promise<EigenschutzHealthDto> {
    return { status: 'ready' };
  }
}
