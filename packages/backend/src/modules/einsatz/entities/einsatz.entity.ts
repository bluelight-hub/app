import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Entität für einen Einsatz
 *
 * Repräsentiert einen Einsatz im System mit allen relevanten Informationen
 * wie Name, Beschreibung und Zeitstempel.
 *
 * @class Einsatz
 */
export class Einsatz {
  /**
   * Eindeutige ID des Einsatzes
   * @example '123e4567-e89b-12d3-a456-426614174000'
   */
  @ApiProperty({
    description: 'Eindeutige ID des Einsatzes',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  /**
   * Name des Einsatzes zur Identifikation
   * @example 'Brandeinsatz Hauptstraße'
   */
  @ApiProperty({
    description: 'Name des Einsatzes',
    example: 'Brandeinsatz Hauptstraße',
  })
  name: string;

  /**
   * Optionale detaillierte Beschreibung des Einsatzes
   * @example 'Großbrand in Mehrfamilienhaus'
   */
  @ApiPropertyOptional({
    description: 'Optionale Beschreibung des Einsatzes',
    example: 'Großbrand in Mehrfamilienhaus',
  })
  beschreibung?: string;

  /**
   * Zeitstempel der Erstellung des Einsatzes
   * @example '2025-05-19T14:30:00Z'
   */
  @ApiProperty({
    description: 'Erstelldatum des Einsatzes',
    example: '2025-05-19T14:30:00Z',
  })
  createdAt: Date;

  /**
   * Zeitstempel der letzten Aktualisierung
   * @example '2025-05-19T15:45:00Z'
   */
  @ApiProperty({
    description: 'Letzte Aktualisierung des Einsatzes',
    example: '2025-05-19T15:45:00Z',
  })
  updatedAt: Date;
}
