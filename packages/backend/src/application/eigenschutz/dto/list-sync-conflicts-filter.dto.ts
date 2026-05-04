import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { IsCuid } from '@/modules/common/decorators/is-cuid.decorator';

/**
 * Query-Parameter für `GET /einsaetze/:einsatzId/sicherheit/eigenschutz/sync-conflicts`
 * (Story 3.10 AC5).
 *
 * Beide Filter sind optional. Werden sie gemeinsam gesetzt, kombiniert das
 * Repository die WHERE-Klauseln (UND-Verknüpfung).
 */
export class ListSyncConflictsFilterDto {
  @ApiPropertyOptional({
    enum: ['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM'],
    description: 'Optional: nur Konflikte eines bestimmten EntityType.',
  })
  @IsOptional()
  @IsEnum(['PSA_PROFIL_ZUWEISUNG', 'GEFAEHRDUNGSBEURTEILUNG_ITEM'])
  entityType?: 'PSA_PROFIL_ZUWEISUNG' | 'GEFAEHRDUNGSBEURTEILUNG_ITEM';

  @ApiPropertyOptional({
    description: 'Optional: cuid2 einer spezifischen Einheit (Mikro-Banner-Deeplink).',
  })
  @IsOptional()
  @IsCuid()
  einheitId?: string;
}
