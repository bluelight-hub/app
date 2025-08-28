import { ApiProperty } from '@nestjs/swagger';

export class DeleteUserResponseDto {
  @ApiProperty({
    description: 'ID des gelöschten Benutzers',
    example: 'user123',
  })
  id: string;

  @ApiProperty({
    description: 'Bestätigung der Löschung',
    example: true,
  })
  deleted: boolean;
}
