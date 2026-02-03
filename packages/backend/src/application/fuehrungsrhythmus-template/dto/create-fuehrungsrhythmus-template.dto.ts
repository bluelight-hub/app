import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO für einen einzelnen Eintrag im Führungsrhythmus-Template.
 */
export class FuehrungsrhythmusEintragDto {
  @ApiProperty({
    description: 'Titel der Erinnerung',
    example: 'Lagebeurteilung',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Titel ist erforderlich' })
  @IsString({ message: 'Titel muss ein String sein' })
  @MaxLength(100, { message: 'Titel darf maximal 100 Zeichen lang sein' })
  titel!: string;

  @ApiProperty({
    description: 'Intervall in Minuten',
    example: 30,
    minimum: 1,
    maximum: 1440,
  })
  @IsInt({ message: 'Intervall muss eine ganze Zahl sein' })
  @Min(1, { message: 'Intervall muss mindestens 1 Minute sein' })
  @Max(1440, { message: 'Intervall darf maximal 1440 Minuten (24h) sein' })
  intervallMinuten!: number;

  @ApiPropertyOptional({
    description: 'Offset in Minuten (Versatz zum Aktivierungszeitpunkt)',
    example: 0,
    minimum: 0,
    maximum: 1440,
    default: 0,
  })
  @IsOptional()
  @IsInt({ message: 'Offset muss eine ganze Zahl sein' })
  @Min(0, { message: 'Offset darf nicht negativ sein' })
  @Max(1440, { message: 'Offset darf maximal 1440 Minuten (24h) sein' })
  offsetMinuten?: number;
}

/**
 * Request DTO zum Erstellen eines neuen Führungsrhythmus-Templates.
 */
export class CreateFuehrungsrhythmusTemplateDto {
  @ApiProperty({
    description: 'Name des Führungsrhythmus-Templates',
    example: 'Führungsrhythmus 30min',
    maxLength: 100,
  })
  @IsNotEmpty({ message: 'Name ist erforderlich' })
  @IsString({ message: 'Name muss ein String sein' })
  @MaxLength(100, { message: 'Name darf maximal 100 Zeichen lang sein' })
  name!: string;

  @ApiPropertyOptional({
    description: 'Optionale Beschreibung',
    example: 'Standard-Führungsrhythmus mit 30-Minuten-Takt',
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
  @IsArray({ message: 'Einträge müssen ein Array sein' })
  @ArrayMinSize(1, { message: 'Mindestens ein Eintrag ist erforderlich' })
  @ValidateNested({ each: true })
  @Type(() => FuehrungsrhythmusEintragDto)
  eintraege!: FuehrungsrhythmusEintragDto[];
}
