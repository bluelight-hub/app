import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO für einen Einsatz-Teilnehmer.
 *
 * Repräsentiert einen User der einem Einsatz mit einem Funkrufnamen beigetreten ist.
 */
export class EinsatzTeilnehmerResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID des Teilnehmer-Eintrags',
    example: 'clx1234567890abcdefghijk',
  })
  id!: string;

  @ApiProperty({
    description: 'Einsatz-ID',
    example: 'clx1234567890abcdefghijk',
  })
  einsatzId!: string;

  @ApiProperty({
    description: 'User-ID',
    example: 'clx1234567890abcdefghijk',
  })
  userId!: string;

  @ApiProperty({
    description: 'Gewählter Funkrufname für diesen Einsatz',
    example: 'Rotkreuz 83/1',
  })
  funkrufname!: string;

  @ApiProperty({
    description: 'Beitrittszeitpunkt',
    example: '2024-01-15T12:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  joinedAt!: Date;

  @ApiPropertyOptional({
    description: 'Austrittszeitpunkt (null wenn noch aktiv)',
    example: null,
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  leftAt?: Date | null;
}
