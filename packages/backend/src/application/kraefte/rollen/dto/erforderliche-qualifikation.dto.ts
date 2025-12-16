import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO für erforderliche Qualifikationen in Response-Objekten.
 *
 * Enthält die aufgelösten Qualifikations-Details aus der M:N-Relation.
 */
export class ErforderlicheQualifikationDto {
  @ApiProperty({ description: 'ID der Qualifikation' })
  qualifikationId!: string;

  @ApiProperty({ description: 'Name der Qualifikation' })
  qualifikationName!: string;

  @ApiProperty({ description: 'Abkürzung der Qualifikation' })
  qualifikationAbkuerzung!: string;

  @ApiProperty({ description: 'Ob diese Qualifikation Pflicht ist' })
  istPflicht!: boolean;
}
