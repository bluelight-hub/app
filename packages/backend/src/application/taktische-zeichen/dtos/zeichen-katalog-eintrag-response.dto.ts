import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ZeichenDefinitionDto } from './taktisches-zeichen-response.dto';

/**
 * Response DTO für einen Eintrag im Zeichen-Katalog.
 * Enthält vordefinierte taktische Zeichen als Vorlagen für Benutzer.
 */
export class ZeichenKatalogEintragResponseDto {
  @ApiProperty({ description: 'Eindeutige ID des Katalogeintrags', example: 'clw3h8x9y0000qwertyuiopas' })
  id!: string;

  @ApiProperty({ description: 'Name des Katalogeintrags', example: 'Löschgruppenfahrzeug (LF 10)' })
  name!: string;

  @ApiProperty({ description: 'Kategorie des Katalogeintrags (z.B. "Führung", "Feuerwehr", "THW")', example: 'Feuerwehr' })
  kategorie!: string;

  @ApiPropertyOptional({ description: 'Optionale Beschreibung des Katalogeintrags', example: 'Standard-Löschfahrzeug für die Feuerwehr' })
  beschreibung?: string;

  @ApiProperty({ description: 'Zeichendefinition des Katalogeintrags', type: ZeichenDefinitionDto })
  zeichenDefinition!: ZeichenDefinitionDto;

  @ApiProperty({ description: 'Tags zur Verschlagwortung', example: ['Feuerwehr', 'Fahrzeug', 'Löschfahrzeug'], type: [String] })
  tags!: string[];

  @ApiProperty({ description: 'Sortierungsreihenfolge innerhalb der Kategorie', example: 1 })
  sortOrder!: number;

  @ApiProperty({ description: 'Gibt an ob es sich um ein Standard-Zeichen handelt', example: true })
  istStandard!: boolean;
}
