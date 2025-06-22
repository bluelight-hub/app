import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, Length, IsUUID } from 'class-validator';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/types';

/**
 * DTO für TOTP Setup Response
 */
export class TotpSetupResponseDto {
  @ApiProperty({ description: 'QR Code as data URL for scanning' })
  qrCode: string;

  @ApiProperty({ description: 'Secret key for manual entry' })
  secret: string;

  @ApiProperty({ description: 'Backup codes for recovery', type: [String] })
  backupCodes: string[];
}

/**
 * DTO für TOTP Verification
 */
export class VerifyTotpDto {
  @ApiProperty({ description: 'TOTP code from authenticator app', example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Length(6, 8)
  code: string;
}

/**
 * DTO für MFA Login Verification
 */
export class MfaLoginDto {
  @ApiProperty({ description: 'MFA challenge ID from login response' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  challengeId: string;

  @ApiPropertyOptional({ description: 'TOTP code or backup code' })
  @IsString()
  @IsOptional()
  @Length(6, 8)
  totpCode?: string;

  @ApiPropertyOptional({
    description: 'WebAuthn authentication response',
  })
  @IsOptional()
  webAuthnResponse?: AuthenticationResponseJSON;
}

/**
 * DTO für WebAuthn Registration Start Response
 */
export class WebAuthnRegistrationStartDto {
  @ApiProperty({ description: 'WebAuthn registration options' })
  options: any;

  @ApiProperty({ description: 'Challenge to be stored for verification' })
  challenge: string;
}

/**
 * DTO für WebAuthn Registration Completion
 */
export class WebAuthnRegistrationCompleteDto {
  @ApiProperty({
    description: 'WebAuthn registration response from client',
  })
  @IsNotEmpty()
  response: RegistrationResponseJSON;

  @ApiProperty({ description: 'Challenge from registration start' })
  @IsString()
  @IsNotEmpty()
  challenge: string;

  @ApiPropertyOptional({ description: 'User-friendly name for the device' })
  @IsString()
  @IsOptional()
  deviceName?: string;
}

/**
 * DTO für WebAuthn Authentication Start Response
 */
export class WebAuthnAuthenticationStartDto {
  @ApiProperty({ description: 'WebAuthn authentication options' })
  options: any;

  @ApiProperty({ description: 'Challenge to be stored for verification' })
  challenge: string;
}

/**
 * DTO für WebAuthn Authentication Completion
 */
export class WebAuthnAuthenticationCompleteDto {
  @ApiProperty({
    description: 'WebAuthn authentication response from client',
  })
  @IsNotEmpty()
  response: AuthenticationResponseJSON;

  @ApiProperty({ description: 'Challenge from authentication start' })
  @IsString()
  @IsNotEmpty()
  challenge: string;
}

/**
 * DTO für MFA Methods Response
 */
export class MfaMethodsResponseDto {
  @ApiPropertyOptional({
    description: 'TOTP method info',
    type: 'object',
    properties: {
      lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
    },
  })
  totp: {
    lastUsedAt: Date | null;
  } | null;

  @ApiProperty({
    description: 'WebAuthn credentials',
    type: 'array',
    items: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string', nullable: true },
        deviceType: { type: 'string' },
        lastUsedAt: { type: 'string', format: 'date-time', nullable: true },
        createdAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  webauthn: Array<{
    id: string;
    name: string | null;
    deviceType: string;
    lastUsedAt: Date | null;
    createdAt: Date;
  }>;
}

/**
 * DTO für Remove WebAuthn Credential
 */
export class RemoveWebAuthnCredentialDto {
  @ApiProperty({ description: 'ID of the WebAuthn credential to remove' })
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  credentialId: string;
}
