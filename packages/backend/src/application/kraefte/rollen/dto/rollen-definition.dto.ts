import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErforderlicheQualifikationDto } from '@application/kraefte/rollen';

/**
 * Response DTO für RollenDefinition.
 *
 * Enthält alle Felder einer Rolle inklusive der aufgelösten Qualifikationen.
 */
export class RollenDefinitionDto {
  @ApiProperty({ description: 'Eindeutige ID der Rolle' })
  id!: string;

  @ApiProperty({ description: 'Name der Rolle' })
  name!: string;

  @ApiPropertyOptional({ description: 'Funkrufname der Rolle' })
  funkrufname?: string;

  @ApiPropertyOptional({ description: 'Beschreibung der Rolle' })
  beschreibung?: string;

  @ApiProperty({ description: 'Ob die Rolle aktiv ist' })
  istAktiv!: boolean;

  @ApiProperty({ description: 'Sortierreihenfolge' })
  sortOrder!: number;

  @ApiProperty({ type: [ErforderlicheQualifikationDto], description: 'Erforderliche Qualifikationen für diese Rolle' })
  erforderlicheQualifikationen!: ErforderlicheQualifikationDto[];

  @ApiProperty({ description: 'Erstellungsdatum' })
  createdAt!: Date;

  @ApiProperty({ description: 'ID des Erstellers' })
  createdBy!: string;

  @ApiProperty({ description: 'Letzte Änderung' })
  updatedAt!: Date;

  @ApiPropertyOptional({ description: 'ID des letzten Bearbeiters' })
  updatedBy?: string;
}
