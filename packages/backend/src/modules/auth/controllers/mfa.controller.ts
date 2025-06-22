import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards';
import { CurrentUser } from '../decorators';
import { JWTPayload } from '../types/jwt.types';
import { MfaService } from '../services/mfa.service';
import {
  TotpSetupResponseDto,
  VerifyTotpDto,
  WebAuthnRegistrationStartDto,
  WebAuthnRegistrationCompleteDto,
  WebAuthnAuthenticationStartDto,
  WebAuthnAuthenticationCompleteDto,
  MfaMethodsResponseDto,
  RemoveWebAuthnCredentialDto,
} from '../dto/mfa.dto';

/**
 * Controller für Multi-Factor Authentication (MFA) Verwaltung.
 * Bietet Endpoints für TOTP und WebAuthn Setup und Verwaltung.
 */
@ApiTags('MFA')
@Controller('api/auth/mfa')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class MfaController {
  constructor(private mfaService: MfaService) {}

  @Get('methods')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get user MFA methods' })
  @ApiResponse({
    status: 200,
    description: 'User MFA methods retrieved',
    type: MfaMethodsResponseDto,
  })
  async getMfaMethods(@CurrentUser() user: JWTPayload): Promise<MfaMethodsResponseDto> {
    return await this.mfaService.getUserMfaMethods(user.sub);
  }

  // ===== TOTP Endpoints =====

  @Post('totp/setup')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Setup TOTP authentication' })
  @ApiResponse({
    status: 200,
    description: 'TOTP setup initiated',
    type: TotpSetupResponseDto,
  })
  @ApiResponse({ status: 400, description: 'TOTP already setup' })
  async setupTotp(@CurrentUser() user: JWTPayload): Promise<TotpSetupResponseDto> {
    return await this.mfaService.setupTotp(user.sub);
  }

  @Post('totp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify TOTP code and enable MFA' })
  @ApiResponse({ status: 200, description: 'TOTP verified and MFA enabled' })
  @ApiResponse({ status: 400, description: 'Invalid TOTP code' })
  async verifyTotp(
    @CurrentUser() user: JWTPayload,
    @Body() dto: VerifyTotpDto,
  ): Promise<{ success: boolean }> {
    const success = await this.mfaService.verifyTotp(user.sub, dto.code);
    return { success };
  }

  @Delete('totp')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disable TOTP authentication' })
  @ApiResponse({ status: 204, description: 'TOTP disabled' })
  async disableTotp(@CurrentUser() user: JWTPayload): Promise<void> {
    await this.mfaService.disableTotp(user.sub);
  }

  // ===== WebAuthn Endpoints =====

  @Post('webauthn/register/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start WebAuthn registration' })
  @ApiResponse({
    status: 200,
    description: 'WebAuthn registration started',
    type: WebAuthnRegistrationStartDto,
  })
  async startWebAuthnRegistration(
    @CurrentUser() user: JWTPayload,
  ): Promise<WebAuthnRegistrationStartDto> {
    return await this.mfaService.startWebAuthnRegistration(user.sub);
  }

  @Post('webauthn/register/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete WebAuthn registration' })
  @ApiResponse({ status: 200, description: 'WebAuthn registration completed' })
  @ApiResponse({ status: 400, description: 'Registration verification failed' })
  async completeWebAuthnRegistration(
    @CurrentUser() user: JWTPayload,
    @Body() dto: WebAuthnRegistrationCompleteDto,
  ): Promise<{ success: boolean }> {
    const success = await this.mfaService.completeWebAuthnRegistration(
      user.sub,
      dto.response,
      dto.challenge,
      dto.deviceName,
    );
    return { success };
  }

  @Post('webauthn/authenticate/start')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Start WebAuthn authentication' })
  @ApiResponse({
    status: 200,
    description: 'WebAuthn authentication started',
    type: WebAuthnAuthenticationStartDto,
  })
  async startWebAuthnAuthentication(
    @CurrentUser() user: JWTPayload,
  ): Promise<WebAuthnAuthenticationStartDto> {
    return await this.mfaService.startWebAuthnAuthentication(user.sub);
  }

  @Post('webauthn/authenticate/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Complete WebAuthn authentication' })
  @ApiResponse({ status: 200, description: 'WebAuthn authentication completed' })
  @ApiResponse({ status: 401, description: 'Authentication verification failed' })
  async completeWebAuthnAuthentication(
    @CurrentUser() user: JWTPayload,
    @Body() dto: WebAuthnAuthenticationCompleteDto,
  ): Promise<{ success: boolean }> {
    const success = await this.mfaService.completeWebAuthnAuthentication(
      user.sub,
      dto.response,
      dto.challenge,
    );
    return { success };
  }

  @Delete('webauthn/credential')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a WebAuthn credential' })
  @ApiResponse({ status: 204, description: 'WebAuthn credential removed' })
  async removeWebAuthnCredential(
    @CurrentUser() user: JWTPayload,
    @Body() dto: RemoveWebAuthnCredentialDto,
  ): Promise<void> {
    await this.mfaService.removeWebAuthnCredential(user.sub, dto.credentialId);
  }
}
