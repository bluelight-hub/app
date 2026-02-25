import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Response DTO für einen Einsatz-Teilnehmer.
 *
 * Repräsentiert einen User der einem Einsatz mit einer EinsatzPerson beigetreten ist.
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
    description: 'Verknüpfte EinsatzPerson-ID',
    example: 'clx1234567890abcdefghijk',
  })
  einsatzPersonId!: string;

  @ApiProperty({
    description: 'Vorname der verknüpften Person',
    example: 'Max',
  })
  personVorname!: string;

  @ApiProperty({
    description: 'Nachname der verknüpften Person',
    example: 'Mustermann',
  })
  personNachname!: string;

  @ApiPropertyOptional({
    description: 'Funkrufname der verknüpften Person',
    example: 'Rotkreuz 83/1',
    nullable: true,
  })
  personFunkrufname?: string | null;

  @ApiProperty({
    description: 'Funktion der verknüpften Person',
    example: 'Gruppenführer',
  })
  personFunktion!: string;

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
