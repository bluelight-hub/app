import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO für Empfänger-Status-Änderung.
 *
 * Unterstützt drei Aktionen:
 * - ZUSTELLEN: Markiert einen Empfänger als zugestellt
 * - QUITTIEREN: Quittiert stellvertretend (quittierungArt erforderlich)
 * - ZURUECKSETZEN: Setzt Status zurück (zielStatus erforderlich)
 */
export class AendereEmpfaengerStatusDto {
  @ApiProperty({
    description: 'Auszuführende Aktion',
    enum: ['ZUSTELLEN', 'QUITTIEREN', 'ZURUECKSETZEN'],
    example: 'ZUSTELLEN',
  })
  @IsNotEmpty()
  @IsString()
  @IsIn(['ZUSTELLEN', 'QUITTIEREN', 'ZURUECKSETZEN'])
  aktion!: 'ZUSTELLEN' | 'QUITTIEREN' | 'ZURUECKSETZEN';

  @ApiPropertyOptional({
    description: 'Art der Quittierung (nur bei Aktion QUITTIEREN)',
    enum: ['VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN'],
    example: 'VERSTANDEN',
  })
  @IsOptional()
  @IsString()
  @IsIn(['VERSTANDEN', 'RUECKFRAGE', 'NICHT_VERSTANDEN'])
  quittierungArt?: 'VERSTANDEN' | 'RUECKFRAGE' | 'NICHT_VERSTANDEN';

  @ApiPropertyOptional({
    description: 'Optionaler Kommentar (nur bei Aktion QUITTIEREN)',
    example: 'Stellvertretend quittiert',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  kommentar?: string;

  @ApiPropertyOptional({
    description: 'Zielstatus beim Zurücksetzen (nur bei Aktion ZURUECKSETZEN)',
    enum: ['ERTEILT', 'ZUGESTELLT'],
    example: 'ZUGESTELLT',
  })
  @IsOptional()
  @IsString()
  @IsIn(['ERTEILT', 'ZUGESTELLT'])
  zielStatus?: 'ERTEILT' | 'ZUGESTELLT';
}
