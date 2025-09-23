import { ApiProperty } from '@nestjs/swagger';

export class StatusCountsDto {
  @ApiProperty({
    description: 'Anzahl der Einsätze mit Status ANGELEGT',
    example: 10,
  })
  angelegt!: number;

  @ApiProperty({
    description: 'Anzahl der Einsätze mit Status IN_BEARBEITUNG',
    example: 5,
  })
  inBearbeitung!: number;

  @ApiProperty({
    description: 'Anzahl der Einsätze mit Status ABGESCHLOSSEN',
    example: 8,
  })
  abgeschlossen!: number;

  @ApiProperty({
    description: 'Anzahl der Einsätze mit Status ARCHIVIERT',
    example: 12,
  })
  archiviert!: number;
}

export class StatusCountsResponseDto {
  @ApiProperty({
    description: 'Gesamtanzahl aller Einsätze',
    example: 35,
  })
  total!: number;

  @ApiProperty({
    description: 'Anzahl der Einsätze pro Status',
    type: StatusCountsDto,
  })
  counts!: StatusCountsDto;
}
