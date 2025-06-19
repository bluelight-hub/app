import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength, IsBoolean, IsOptional } from 'class-validator';

/**
 * Data transfer object for user login requests.
 * Contains credentials and optional remember me flag.
 */
export class LoginDto {
  @ApiProperty({ example: 'admin@bluelight-hub.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: false, required: false })
  @IsBoolean()
  @IsOptional()
  rememberMe?: boolean;
}

/**
 * Data transfer object for multi-factor authentication verification.
 * Contains the MFA code and challenge ID.
 */
export class MfaVerifyDto {
  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6)
  code: string;

  @ApiProperty()
  @IsString()
  challengeId: string;
}

/**
 * Data transfer object for token refresh requests.
 * Contains the refresh token to exchange for new tokens.
 */
export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
