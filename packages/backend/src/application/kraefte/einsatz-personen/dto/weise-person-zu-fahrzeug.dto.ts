import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

/**
 * DTO für PUT /einsaetze/:einsatzId/personen/:personId/fahrzeug
 *
 * Enthält nur die fahrzeugId - personId und einsatzId kommen aus der URL.
 *
 * **Verwendung:**
 * - Weist eine Person einem Fahrzeug zu
 * - Person und Fahrzeug müssen zum gleichen Einsatz gehören
 * - Überschreibt vorherige Fahrzeug-Zuweisungen automatisch
 *
 * **Validierung:**
 * - fahrzeugId muss CUID2-Format haben (validiert durch Command Handler)
 * - Fahrzeug muss im gleichen Einsatz existieren (Business Logic Validation)
 * - Person darf nicht bereits dem gleichen Fahrzeug zugewiesen sein (Idempotenz)
 */
export class WeisePersonZuFahrzeugZuDto {
  @ApiProperty({
    description: 'ID des Fahrzeugs zu dem die Person zugewiesen werden soll (CUID2)',
    example: 'clxxxxxxxxxxxxxxxxxxxxxxxxx',
  })
  @IsString()
  @IsNotEmpty()
  fahrzeugId!: string;
}
