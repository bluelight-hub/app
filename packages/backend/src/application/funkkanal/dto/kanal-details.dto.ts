import { ApiExtraModels, ApiProperty, ApiPropertyOptional, getSchemaPath } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Discriminated-Union-DTOs für {@link KanalDetailsShape}.
 *
 * Jeder Kanal hat genau einen Typ (TMO/DMO/Analog); der Diskriminator `type`
 * steuert die gültigen Payload-Felder. Die Swagger-`discriminator`-Annotation
 * sorgt für saubere Client-Generation.
 */
export class TmoDetailsDto {
  @ApiProperty({ enum: ['tmo'], example: 'tmo' })
  @IsIn(['tmo'])
  type!: 'tmo';

  @ApiProperty({ example: 'BOS-RLP-TMO-1', description: 'TMO-Sprechgruppe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  sprechgruppe!: string;

  @ApiPropertyOptional({ example: '2629031', description: 'Optionale GSSI', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  gssi?: string;
}

export class DmoDetailsDto {
  @ApiProperty({ enum: ['dmo'], example: 'dmo' })
  @IsIn(['dmo'])
  type!: 'dmo';

  @ApiProperty({ example: '310', description: 'DMO-Kanalnummer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  dmoKanal!: string;

  @ApiPropertyOptional({ example: 'Repeater Nord', description: 'Optionaler Repeater-Hinweis', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  repeater?: string;
}

export class AnalogDetailsDto {
  @ApiProperty({ enum: ['analog'], example: 'analog' })
  @IsIn(['analog'])
  type!: 'analog';

  @ApiProperty({ enum: ['4m', '2m'], example: '4m', description: 'Analog-Band' })
  @IsIn(['4m', '2m'])
  band!: '4m' | '2m';

  @ApiProperty({ example: '84,975 MHz', description: 'Frequenz (freies Format)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  frequenz!: string;

  @ApiPropertyOptional({ example: '468 G/U', description: 'Optionale Kanalnummer', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  kanalnummer?: string;
}

/**
 * Union aller KanalDetails-Varianten. Wird als Schema-Referenz in CRUD-DTOs verwendet.
 *
 * Die `oneOf`+`discriminator`-Annotation am Feld sorgt dafür, dass der generierte
 * Client eine korrekte Diskriminator-Union erzeugt.
 */
export type KanalDetailsUnionDto = TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;

/**
 * Swagger-Schema-Options für KanalDetails-Union. In anderen DTOs via
 * `@ApiProperty(KANAL_DETAILS_SCHEMA)` wiederverwendbar.
 */
export const KANAL_DETAILS_SCHEMA = {
  description: 'Kanaltyp-spezifische Details (discriminated union)',
  oneOf: [{ $ref: getSchemaPath(TmoDetailsDto) }, { $ref: getSchemaPath(DmoDetailsDto) }, { $ref: getSchemaPath(AnalogDetailsDto) }],
  discriminator: {
    propertyName: 'type',
    mapping: {
      tmo: getSchemaPath(TmoDetailsDto),
      dmo: getSchemaPath(DmoDetailsDto),
      analog: getSchemaPath(AnalogDetailsDto),
    },
  },
};

/**
 * Marker-Decorator, der alle KanalDetails-Varianten für Swagger registriert.
 * Wird auf Controllern / DTOs verwendet, die die Union referenzieren.
 */
export const ApiKanalDetailsExtraModels = () => ApiExtraModels(TmoDetailsDto, DmoDetailsDto, AnalogDetailsDto);
