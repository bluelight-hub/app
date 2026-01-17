import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO für den Einsatz-Beitritt Request.
 *
 * Wird verwendet wenn ein User einem Einsatz mit einem Funkrufnamen beitritt.
 */
export class JoinEinsatzDto {
  @ApiProperty({
    description: 'Funkrufname den der User für diesen Einsatz verwenden möchte',
    example: 'Rotkreuz 83/1',
    minLength: 1,
    maxLength: 100,
  })
  @IsString({ message: 'funkrufname muss ein String sein' })
  @MinLength(1, { message: 'Funkrufname darf nicht leer sein' })
  @MaxLength(100, { message: 'Funkrufname darf maximal 100 Zeichen lang sein' })
  funkrufname!: string;
}
