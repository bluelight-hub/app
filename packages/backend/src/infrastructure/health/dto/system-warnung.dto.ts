import { ApiProperty } from '@nestjs/swagger';

/**
 * System-Warnung DTO.
 *
 * Repräsentiert eine aktive System-Warnung bei Schwellwertueberschreitung.
 *
 * @see Story 5.6 AC3
 */
export class SystemWarnungDto {
  @ApiProperty({
    example: 'ZUSTELLRATE',
    enum: ['ZUSTELLRATE', 'OUTBOX_STAU', 'LATENZ', 'CIRCUIT_BREAKER'],
    description: 'Typ der Warnung',
  })
  warnungTyp!: string;

  @ApiProperty({
    example: 95,
    description: 'Der ueberschrittene Schwellwert',
  })
  schwellwert!: number;

  @ApiProperty({
    example: 87.5,
    description: 'Der gemessene Ist-Wert',
  })
  aktuellerWert!: number;

  @ApiProperty({
    example: '2026-02-23T14:30:00.000Z',
    description: 'Zeitpunkt der Warnung (server-autoritativ)',
  })
  timestamp!: string;
}
