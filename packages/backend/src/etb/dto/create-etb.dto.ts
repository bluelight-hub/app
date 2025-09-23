import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateEtbDto {
  @ApiProperty({
    description: 'ID of the Einsatz for which to create the ETB',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  @IsNotEmpty()
  einsatzId!: string;
}
