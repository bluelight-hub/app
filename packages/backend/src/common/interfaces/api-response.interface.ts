import { ApiProperty } from '@nestjs/swagger';

/**
 * Klasse für Metadaten in API-Antworten
 */
export class ApiMeta {
  /**
   * Zeitstempel der Antwort im ISO-Format
   */
  @ApiProperty({
    description: 'Zeitstempel der Antwort',
    example: '2023-01-01T12:00:00.000Z',
  })
  timestamp: string;
}

/**
 * Abstrakte Basisklasse für alle API-Antworten
 * @template T Typ der Antwortdaten
 */
export abstract class ApiResponse<T> {
  /**
   * Die eigentlichen Antwortdaten
   */
  abstract data: T;

  /**
   * Metadaten zur Antwort
   */
  @ApiProperty({
    description: 'Metadaten zur Antwort',
    type: ApiMeta,
  })
  meta: ApiMeta;

  /**
   * Optionale Nachricht
   */
  @ApiProperty({
    description: 'Optionale Nachricht',
    required: false,
    example: 'Operation erfolgreich durchgeführt',
  })
  message?: string;
}
