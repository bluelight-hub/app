import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO zum Erstellen eines neuen ETB für einen Einsatz.
 */
export class CreateEtbDto {
  @ApiProperty({
    description: 'ID of the Einsatz for which to create the ETB',
    example: '1FbFxKghXUeg3Od0Slhr1',
  })
  @IsString({ message: 'einsatzId muss eine Zeichenkette sein' })
  @IsNotEmpty({ message: 'einsatzId darf nicht leer sein' })
  einsatzId!: string;
}
