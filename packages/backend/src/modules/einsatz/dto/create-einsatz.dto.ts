import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * Data Transfer Object für die Einsatzerstellung
 *
 * Dieses DTO definiert die erforderlichen und optionalen Felder
 * für die Erstellung eines neuen Einsatzes. Es beinhaltet
 * Validierungsregeln und Swagger-Dokumentation für die API.
 *
 * @class CreateEinsatzDto
 */
export class CreateEinsatzDto {
  /**
   * Der Name des Einsatzes.
   * Muss vorhanden sein und darf nicht leer sein.
   */
  @ApiProperty({
    description: 'Name des Einsatzes',
    example: 'Brandeinsatz Hauptstraße',
  })
  @IsNotEmpty({ message: 'Der Name darf nicht leer sein' })
  @IsString({ message: 'Der Name muss ein String sein' })
  name: string;

  /**
   * Optionale Beschreibung des Einsatzes.
   */
  @ApiPropertyOptional({
    description: 'Beschreibung des Einsatzes',
    example: 'Großbrand in Mehrfamilienhaus',
  })
  @IsOptional()
  @IsString({ message: 'Die Beschreibung muss ein String sein' })
  beschreibung?: string;
}
