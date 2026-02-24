import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';
import { CreateBefehlEmpfaengerDto } from './create-befehl.dto';

/**
 * DTO fuer das Erstellen eines Korrekturbefehls.
 *
 * Enthaelt die gleichen Felder wie CreateBefehlDto, aber OHNE einsatzId
 * (wird vom Original-Befehl uebernommen) und OHNE originalBefehlId
 * (kommt aus dem URL-Pfad :id/korrigieren).
 *
 * **Validierungsregeln:**
 * - empfaenger: min. 1 Empfaenger (Pflicht)
 * - befehlsgeber: String Display-Name (Pflicht)
 * - erstellerId: String (Pflicht)
 * - auftrag: min. 3 Zeichen (Pflicht)
 * - zeitvorgabe, ereignis, mittel, ziel, weg: optional
 */
export class KorrigiereBefehlDto {
  @ApiProperty({
    description: 'Empfaenger mit Name und optionaler User-ID (min 1)',
    type: () => [CreateBefehlEmpfaengerDto],
    example: [{ name: 'ZF Meier', empfaengerId: 'clw3h8x9y0001qwertyuiopas' }, { name: 'Polizei' }],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateBefehlEmpfaengerDto)
  @ArrayMinSize(1)
  empfaenger!: CreateBefehlEmpfaengerDto[];

  @ApiProperty({ description: 'Befehlsgeber Display-Name', example: 'EL Mueller' })
  @IsString()
  befehlsgeber!: string;

  @ApiProperty({ description: 'Ersteller User-ID', example: 'clw3h8x9y0004qwertyuiopas' })
  @IsString()
  erstellerId!: string;

  @ApiProperty({ description: 'Auftrag (Pflicht, min 3 Zeichen)', example: 'Patientenablage einrichten' })
  @IsString()
  @MinLength(3)
  auftrag!: string;

  @ApiPropertyOptional({ description: 'Zeitvorgabe (optional)', example: '15 min' })
  @IsOptional()
  @IsString()
  zeitvorgabe?: string;

  @ApiPropertyOptional({ description: 'Ereignis (EAMZW)', example: 'Wohnungsbrand im 2. OG' })
  @IsOptional()
  @IsString()
  ereignis?: string;

  @ApiPropertyOptional({ description: 'Mittel (EAMZW)', example: '2 Loeschzuege' })
  @IsOptional()
  @IsString()
  mittel?: string;

  @ApiPropertyOptional({ description: 'Ziel (EAMZW)', example: 'Brandbekaempfung' })
  @IsOptional()
  @IsString()
  ziel?: string;

  @ApiPropertyOptional({ description: 'Weg (EAMZW)', example: 'Ueber Haupteingang' })
  @IsOptional()
  @IsString()
  weg?: string;
}
