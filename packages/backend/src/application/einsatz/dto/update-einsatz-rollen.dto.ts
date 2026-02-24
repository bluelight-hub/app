import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsEnum, IsNotEmpty, IsString, ValidateNested } from 'class-validator';

/**
 * Einzelne Rollenzuweisung innerhalb des Batch-Updates.
 */
export class RollenZuweisungDto {
  @ApiProperty({
    description: 'User-ID (CUID2)',
    example: 'clw3h8x9y0000qwertyuiopas',
  })
  @IsString()
  @IsNotEmpty({ message: 'userId darf nicht leer sein' })
  userId!: string;

  @ApiProperty({
    description: 'Zuzuweisende Rolle',
    enum: ['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER'],
    example: 'BEFEHLSGEBER',
  })
  @IsString()
  @IsNotEmpty({ message: 'rolle darf nicht leer sein' })
  @IsEnum(['BEFEHLSGEBER', 'ERSTELLER', 'EMPFAENGER', 'BEOBACHTER'], {
    message: 'rolle muss BEFEHLSGEBER, ERSTELLER, EMPFAENGER oder BEOBACHTER sein',
  })
  rolle!: string;
}

/**
 * Request DTO fuer PUT /api/v-alpha/einsaetze/:id/rollen.
 *
 * Story 5.2 AC3: Akzeptiert ein Array von { userId, rolle } Mappings.
 * Ersetzt ALLE Rollen fuer den Einsatz (PUT-Semantik).
 */
export class UpdateEinsatzRollenDto {
  @ApiProperty({
    description: 'Array von Rollenzuweisungen',
    type: [RollenZuweisungDto],
  })
  @IsArray()
  @ArrayMinSize(0)
  @ValidateNested({ each: true })
  @Type(() => RollenZuweisungDto)
  zuweisungen!: RollenZuweisungDto[];
}
