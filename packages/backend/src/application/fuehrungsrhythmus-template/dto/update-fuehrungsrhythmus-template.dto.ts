import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { FuehrungsrhythmusEintragDto } from './create-fuehrungsrhythmus-template.dto';

/**
 * Request DTO zum Aktualisieren eines Fuehrungsrhythmus-Templates (Story 6.8).
 */
export class UpdateFuehrungsrhythmusTemplateDto {
  @ApiProperty({
    description: 'Name des Fuehrungsrhythmus-Templates',
    example: 'Fuehrungsrhythmus 30min',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name ist erforderlich' })
  @IsString({ message: 'Name muss ein String sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Standard-Fuehrungsrhythmus mit 30-Minuten-Takt',
    maxLength: 500,
  })
  @IsOptional()
  @IsString({ message: 'Beschreibung muss ein String sein' })
  @MaxLength(500, { message: 'Beschreibung darf maximal 500 Zeichen lang sein' })
  beschreibung?: string;

  @ApiProperty({
    description: 'Erinnerungen im Template',
    type: [FuehrungsrhythmusEintragDto],
    minItems: 1,
  })
  @IsArray({ message: 'Eintraege muessen ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens ein Eintrag ist erforderlich' })
  @ValidateNested({ each: true })
  @Type(() => FuehrungsrhythmusEintragDto)
  eintraege!: FuehrungsrhythmusEintragDto[];
}
