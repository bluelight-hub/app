import { GetKanalplanQuery, GetKanalplanQueryHandler } from '@/application/funkkanal/queries/get-kanalplan';
import type { IKanalplanPdfService } from '@/application/funkkanal/ports/i-kanalplan-pdf.service';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { EINSATZ_REPOSITORY, KANALPLAN_PDF_SERVICE } from '@/infrastructure/di-tokens';
import type { IEinsatzRepository } from '@domain/repositories/ieinsatz.repository';
import { EinsatzId } from '@domain/value-objects/einsatz-id';
import { Controller, Get, Inject, Param, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProduces, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import type { Response } from 'express';
import { format } from 'date-fns';
import { unwrapOrThrow } from './helpers/funkkanal-error.helper';

/**
 * HTTP-Adapter für den Kanalplan-PDF-Export.
 *
 * Gibt einen PDF-Stream direkt im Response-Body zurück — der generierte
 * API-Client behandelt `application/pdf` als Blob.
 */
@ApiTags('Funkkanal')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@Controller({ path: 'einsatz/:einsatzId/kanalplan', version: 'alpha' })
export class KanalplanExportController {
  constructor(
    private readonly getKanalplanHandler: GetKanalplanQueryHandler,
    @Inject(KANALPLAN_PDF_SERVICE) private readonly pdfService: IKanalplanPdfService,
    @Inject(EINSATZ_REPOSITORY) private readonly einsatzRepository: IEinsatzRepository,
  ) {}

  @Get('export.pdf')
  @ApiOperation({ summary: 'Kanalplan als PDF exportieren' })
  @ApiProduces('application/pdf')
  async exportPdf(@Param('einsatzId') einsatzId: string, @Res() res: Response): Promise<void> {
    const einsatzName = await this.resolveEinsatzName(einsatzId);

    const query = unwrapOrThrow(GetKanalplanQuery.create({ einsatzId, includeArchived: false }));
    const aggregates = unwrapOrThrow(await this.getKanalplanHandler.execute(query));

    const buffer = await this.pdfService.generate({
      einsatzId,
      einsatzName,
      kanaele: aggregates,
      exportiertAm: new Date(),
    });

    const filename = `kanalplan-${einsatzId}-${format(new Date(), 'yyyyMMdd-HHmm')}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  }

  private async resolveEinsatzName(einsatzId: string): Promise<string> {
    const einsatzIdResult = EinsatzId.create(einsatzId);
    if (einsatzIdResult.isFailure || !einsatzIdResult.value) {
      return einsatzId;
    }
    const einsatzResult = await this.einsatzRepository.findById(einsatzIdResult.value);
    if (einsatzResult.isFailure || !einsatzResult.value) {
      return einsatzId;
    }
    const einsatz = einsatzResult.value;
    return [einsatz.nummer, einsatz.alarmstichwort].filter((v) => typeof v === 'string' && v.length > 0).join(' · ') || einsatzId;
  }
}
