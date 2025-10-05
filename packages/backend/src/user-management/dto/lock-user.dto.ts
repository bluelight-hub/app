import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class LockUserDto {
  @ApiProperty({
    description: 'Grund der Sperrung (optional)',
    example: 'Verstoß gegen Nutzungsbedingungen',
    required: false,
    maxLength: 500,
    type: 'string',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Sperrgrund darf maximal 500 Zeichen lang sein' })
  reason?: string;
}
