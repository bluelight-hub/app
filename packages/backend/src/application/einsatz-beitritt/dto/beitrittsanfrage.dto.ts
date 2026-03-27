import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

/**
 * Response DTO für eine Einsatz-Beitrittsanfrage.
 */
export class BeitrittsanfrageResponseDto {
  @ApiProperty({
    description: 'Eindeutige ID der Beitrittsanfrage',
    example: 'clx1234567890abcdefghijk',
  })
  id!: string;

  @ApiProperty({
    description: 'Einsatz-ID',
    example: 'clx1234567890abcdefghijk',
  })
  einsatzId!: string;

  @ApiProperty({
    description: 'User-ID des Antragstellers',
    example: 'clx1234567890abcdefghijk',
  })
  userId!: string;

  @ApiProperty({
    description: 'Status der Anfrage',
    enum: ['OFFEN', 'GENEHMIGT', 'ABGELEHNT'],
    example: 'OFFEN',
  })
  status!: string;

  @ApiProperty({
    description: 'Erstellungszeitpunkt',
    example: '2026-03-27T14:00:00.000Z',
    type: 'string',
    format: 'date-time',
  })
  createdAt!: Date;

  @ApiPropertyOptional({
    description: 'Zeitpunkt der Entscheidung (null wenn noch offen)',
    example: null,
    type: 'string',
    format: 'date-time',
    nullable: true,
  })
  resolvedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'User-ID der entscheidenden Person (null wenn noch offen)',
    example: null,
    nullable: true,
  })
  resolvedBy?: string | null;
}

/**
 * Request DTO zum Entscheiden einer Beitrittsanfrage.
 */
export class ResolveBeitrittsanfrageDto {
  @ApiProperty({
    description: 'Entscheidung: GENEHMIGT oder ABGELEHNT',
    enum: ['GENEHMIGT', 'ABGELEHNT'],
    example: 'GENEHMIGT',
  })
  @IsString()
  @IsNotEmpty()
  @IsIn(['GENEHMIGT', 'ABGELEHNT'])
  decision!: string;
}
