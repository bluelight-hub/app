import { GetRufnamenVorschlaegeQuery, GetRufnamenVorschlaegeQueryHandler, type RufnamenVorschlaegeResult } from '@/application/funkkanal/queries/get-rufnamen-vorschlaege';
import { RufnameVorschlaegeResponseDto } from '@/application/funkkanal/dto';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { unwrapOrThrow } from './helpers/funkkanal-error.helper';

/**
 * HTTP-Adapter für Rufnamen-Vorschläge eines Einsatzes.
 *
 * Liefert zuordnungs-fähige Kräfte (Fahrzeuge, Personen, Einheiten) für die
 * Zuordnungs-UI. Einzelner Endpoint unter dem Einsatz-Nesting.
 */
@ApiTags('Funkkanal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@Controller({ path: 'einsatz/:einsatzId/rufname-vorschlaege', version: 'alpha' })
export class RufnameVorschlaegeController {
  constructor(private readonly handler: GetRufnamenVorschlaegeQueryHandler) {}

  @Get()
  @ApiOperation({ summary: 'Rufnamen-Vorschläge für Zuordnungen abrufen' })
  @ApiWrappedResponse(RufnameVorschlaegeResponseDto, { description: 'Gebündelte Rufnamen-Vorschläge (Fahrzeuge, Personen, Einheiten)' })
  async list(@Param('einsatzId') einsatzId: string): Promise<RufnameVorschlaegeResponseDto> {
    const query = unwrapOrThrow(GetRufnamenVorschlaegeQuery.create({ einsatzId }));
    const result = unwrapOrThrow(await this.handler.execute(query));
    return toResponseDto(result);
  }
}

function toResponseDto(result: RufnamenVorschlaegeResult): RufnameVorschlaegeResponseDto {
  return {
    fahrzeuge: result.fahrzeuge.map((entry) => ({ id: entry.id, funkrufname: entry.funkrufname })),
    personen: result.personen.map((entry) => ({ id: entry.id, funkrufname: entry.funkrufname })),
    einheiten: result.einheiten.map((entry) => ({ id: entry.id, name: entry.name })),
  };
}
