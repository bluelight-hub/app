import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class NavigationResponseDto {
  @ApiProperty({
    description: 'ID des vorherigen/nächsten Einsatzes',
    nullable: true,
    example: 'clq1234567890abcdef',
  })
  @IsOptional()
  @IsString()
  id?: string | null;
}
