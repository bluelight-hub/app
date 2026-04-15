import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AnalogDetailsDto, DmoDetailsDto, KANAL_DETAILS_SCHEMA, TmoDetailsDto } from './kanal-details.dto';

/**
 * Request-DTO für PATCH /einsatz/:einsatzId/funkkanaele/:kanalId.
 *
 * Alle Felder sind optional. Der Controller dispatcht die gesetzten Felder
 * auf die passenden Commands:
 * - `name` → RenameFunkkanalCommand
 * - `details` → ChangeFunkkanalDetailsCommand
 * - `zweck` (auch `null`) → SetFunkkanalZweckCommand
 * - `sortIndex` → SetFunkkanalSortIndexCommand
 * - `status` → ActivateFunkkanalCommand / DeactivateFunkkanalCommand
 */
export class UpdateFunkkanalDto {
  @ApiPropertyOptional({ example: 'Führung 2', description: 'Neuer Kanalname', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    ...KANAL_DETAILS_SCHEMA,
    description: 'Neue Kanaltyp-spezifische Details (discriminated union)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object, {
    keepDiscriminatorProperty: true,
    discriminator: {
      property: 'type',
      subTypes: [
        { value: TmoDetailsDto, name: 'tmo' },
        { value: DmoDetailsDto, name: 'dmo' },
        { value: AnalogDetailsDto, name: 'analog' },
      ],
    },
  })
  details?: TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;

  @ApiPropertyOptional({
    example: 'Führungsabschnitt',
    description: 'Zweck des Kanals; `null` oder leerer String entfernt den Wert',
    maxLength: 500,
    nullable: true,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value : value))
  zweck?: string | null;

  @ApiPropertyOptional({ example: 2, description: 'Neuer sortIndex (Einzel-Update, siehe Reorder für Bulk)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortIndex?: number;

  @ApiPropertyOptional({ enum: ['aktiv', 'inaktiv'], description: 'Status-Toggle: aktiv/inaktiv. Archivieren via DELETE.' })
  @IsOptional()
  @IsString()
  status?: 'aktiv' | 'inaktiv';
}
