import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

/**
 * DTO fuer das Erstellen eines neuen Befehls.
 *
 * Enthaelt alle Pflicht- und optionalen Felder fuer die Befehlserstellung.
 * EAMZW-Felder sind optional — der Befehlstyp wird automatisch computed.
 *
 * **Validierungsregeln:**
 * - einsatzId: UUID (Pflicht)
 * - empfaengerIds: min. 1 Empfaenger (Pflicht)
 * - befehlsgeberId: String (Pflicht)
 * - erstellerId: String (Pflicht)
 * - auftrag: min. 3 Zeichen (Pflicht)
 * - zeitvorgabe, ereignis, mittel, ziel, weg: optional
 */
export class CreateBefehlDto {
  @ApiProperty({ description: 'Einsatz-ID (UUID)', example: 'clw3h8x9y0000qwertyuiopas' })
  @IsString()
  @IsUUID()
  einsatzId!: string;

  @ApiProperty({
    description: 'Empfaenger-IDs (min 1)',
    type: [String],
    example: ['clw3h8x9y0001qwertyuiopas', 'clw3h8x9y0002qwertyuiopas'],
  })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  empfaengerIds!: string[];

  @ApiProperty({ description: 'Befehlsgeber User-ID', example: 'clw3h8x9y0003qwertyuiopas' })
  @IsString()
  befehlsgeberId!: string;

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
