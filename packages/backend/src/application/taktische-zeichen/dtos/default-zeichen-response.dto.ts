import { ApiProperty } from '@nestjs/swagger';
import { ZeichenDefinitionDto } from './taktisches-zeichen-response.dto';

/**
 * Response DTO für einen Default-Zeichen-Eintrag (Fahrzeugtyp oder Einheitentyp).
 * Wird für @ApiWrappedResponse benötigt (Swagger braucht Klassen, keine Interfaces).
 */
export class DefaultZeichenResponseDto {
  @ApiProperty({ description: 'ID des Fahrzeug- oder Einheitentyps', example: 'clw3h8x9y0000qwertyuiopas' })
  referenzId!: string;

  @ApiProperty({ description: 'Typ-Bezeichnung (Fahrzeugtypcode oder Einheitentypname)', example: 'RTW' })
  typBezeichnung!: string;

  @ApiProperty({ description: 'Zeichendefinition als strukturiertes Objekt', type: ZeichenDefinitionDto })
  zeichenDefinition!: ZeichenDefinitionDto;
}
