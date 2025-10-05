import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteUserDto {
  @ApiProperty({
    description: 'Bei true: Admin wird zu USER herabgestuft statt gelöscht (Passwort wird entfernt)',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  downgradeAdmin?: boolean;
}
