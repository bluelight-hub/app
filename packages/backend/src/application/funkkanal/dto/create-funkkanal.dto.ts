import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';
import { AnalogDetailsDto, DmoDetailsDto, KANAL_DETAILS_SCHEMA, TmoDetailsDto } from './kanal-details.dto';

/**
 * Request-DTO für das Anlegen eines neuen Funkkanals.
 *
 * Die `details`-Union wird per Swagger-Discriminator korrekt an den generierten
 * Client weitergereicht. Fachliche Invarianten werden im Command/Handler geprüft.
 */
export class CreateFunkkanalDto {
  @ApiProperty({ example: 'Führung 1', description: 'Eindeutiger Kanalname innerhalb des Einsatzes', maxLength: 100 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name!: string;

  @ApiProperty({
    ...KANAL_DETAILS_SCHEMA,
    description: 'Kanaltyp-spezifische Details (discriminated union)',
  })
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
  details!: TmoDetailsDto | DmoDetailsDto | AnalogDetailsDto;

  @ApiPropertyOptional({ example: 'Einsatzabschnittsleiter', description: 'Optionaler Zweck', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() || undefined : value))
  zweck?: string;

  @ApiPropertyOptional({ example: 0, description: 'Optionaler sortIndex (sonst automatisch ans Ende)', minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortIndex?: number;
}
