import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Request DTO für die Aktivierung eines Führungsrhythmus-Templates.
 */
export class ActivateFuehrungsrhythmusTemplateDto {
  @ApiProperty({ description: 'ID des Einsatzes, für den der Führungsrhythmus aktiviert wird', example: 'clxxxx...' })
  @IsNotEmpty()
  @IsString()
  einsatzId!: string;
}
