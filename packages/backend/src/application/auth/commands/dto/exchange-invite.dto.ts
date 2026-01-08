import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class ExchangeInviteDto {
  @ApiProperty({
    description: 'Der 8-stellige Invite-Code',
    example: 'INV12345',
    minLength: 8,
    maxLength: 8,
  })
  @IsString()
  @Length(8, 8)
  inviteCode!: string;
}
