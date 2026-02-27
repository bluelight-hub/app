import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsOptional, IsString, MinLength, ValidateNested } from 'class-validator';

/**
 * Sub-DTO fuer einen einzelnen Empfaenger bei der Befehlserstellung.
 *
 * name ist Pflicht (Display-Name), empfaengerId ist optional (User-Link).
 * Empfaenger mit empfaengerId koennen in-app quittieren.
 */
export class CreateBefehlEmpfaengerDto {
  @ApiProperty({ description: 'Empfaenger Display-Name', example: 'ZF Meier' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ description: 'User-ID des Empfaengers (optional, fuer In-App-Quittierung)', example: 'clw3h8x9y0001qwertyuiopas' })
  @IsOptional()
  @IsString()
  empfaengerId?: string;
}

/**
 * DTO fuer das Erstellen eines neuen Befehls.
 *
 * Enthaelt alle Pflicht- und optionalen Felder fuer die Befehlserstellung.
 * EAMZW-Felder sind optional — der Befehlstyp wird automatisch computed.
 *
 * **Validierungsregeln:**
 * - einsatzId: String (Pflicht)
 * - empfaenger: min. 1 Empfaenger (Pflicht)
 * - befehlsgeber: String Display-Name (Pflicht)
 * - erstellerId: String (Pflicht)
 * - auftrag: min. 3 Zeichen (Pflicht)
 * - zeitvorgabe, ereignis, mittel, ziel, weg: optional
 */
export class CreateBefehlDto {
  @ApiProperty({ description: 'Einsatz-ID', example: 'clw3h8x9y0000qwertyuiopas' })
  @IsString()
  einsatzId!: string;

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

  @ApiPropertyOptional({ description: 'Befehlsgeber User-ID (optional, wenn Person als Befehlsgeber gewaehlt)', example: 'clw3h8x9y0005qwertyuiopas' })
  @IsOptional()
  @IsString()
  befehlsgeberId?: string;
}
