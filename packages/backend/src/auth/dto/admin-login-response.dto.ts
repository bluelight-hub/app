import { ApiProperty } from '@nestjs/swagger';
import { AdminUserDto } from './admin-user.dto';

/**
 * DTO für die Admin-Login-Response
 */
export class AdminLoginResponseDto {
  @ApiProperty({
    description: 'Admin-Benutzerinformationen',
    type: AdminUserDto,
  })
  user: AdminUserDto;
}
