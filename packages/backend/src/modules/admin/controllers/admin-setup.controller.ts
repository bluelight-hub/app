import { BadRequestException, Body, Controller, Post, ValidationPipe } from '@nestjs/common';
import { ApiBadRequestResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CompleteSetupCommand, CompleteSetupHandler } from '@/application/admin/commands';
import { CompleteSetupDto, SetupResponseDto } from '@/application/admin/dto';
import { ApiWrappedCreatedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { SkipServerAccess } from '@/infrastructure/decorators/skip-server-access.decorator';
import { SkipSetupCheck } from '@/infrastructure/decorators/skip-setup-check.decorator';

/**
 * Controller fuer den initialen Server-Setup.
 *
 * Stellt den `/admin/setup` Endpoint bereit, der nur EINMAL
 * aufgerufen werden kann. Nach erfolgreichem Setup ist der
 * Endpoint gesperrt (400 SETUP_ALREADY_COMPLETED).
 *
 * **Guard-Bypass (Story 1.1a + 1.2):**
 * - `@SkipSetupCheck()`: Setup-Pending-Guard ueberspringen (sonst Deadlock)
 * - `@SkipServerAccess()`: Server-Access-Guard ueberspringen (Token existiert noch nicht)
 *
 * **Security:**
 * - Kein Auth-Guard: Setup erfolgt VOR User-Existenz
 * - Rate-Limiting via ThrottlerGuard bleibt aktiv
 * - Nach erstem Aufruf: Endpoint ist effektiv gesperrt
 *
 * @example
 * ```bash
 * curl -X POST http://localhost:3091/api/admin/setup \
 *   -H "Content-Type: application/json" \
 *   -d '{"username": "admin", "password": "SecurePassword123!"}'
 * ```
 */
@Controller('admin')
@ApiTags('admin')
export class AdminSetupController {
  constructor(private readonly completeSetupHandler: CompleteSetupHandler) {}

  /**
   * Fuehrt den initialen Server-Setup durch.
   *
   * Erstellt den ersten Admin-User und generiert einen Server-Access-Token.
   * Der Token wird NUR in dieser Response zurueckgegeben und kann spaeter
   * NICHT erneut abgerufen werden.
   *
   * **Wichtig:** Dieser Endpoint kann nur EINMAL erfolgreich aufgerufen werden!
   *
   * @param dto - Admin-Credentials (username, password)
   * @returns SetupResponseDto mit User-Info und Access-Token
   * @throws BadRequestException wenn Setup bereits abgeschlossen
   */
  @Post('setup')
  @SkipSetupCheck()
  @SkipServerAccess()
  @ApiOperation({
    summary: 'Complete initial server setup',
    description:
      'Creates the first admin user and generates a server access token. This endpoint can only be called ONCE. The access token is returned only in this response and cannot be retrieved later.',
  })
  @ApiWrappedCreatedResponse(SetupResponseDto, {
    description: 'Setup completed successfully. IMPORTANT: Save the access token - it will not be shown again!',
  })
  @ApiBadRequestResponse({
    description: 'Setup already completed or validation error',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 400 },
        error: { type: 'string', example: 'Bad Request' },
        message: { type: 'string', example: 'SETUP_ALREADY_COMPLETED' },
      },
    },
  })
  async completeSetup(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: CompleteSetupDto,
  ): Promise<SetupResponseDto> {
    // Command erstellen
    const commandResult = CompleteSetupCommand.create({
      username: dto.username,
      password: dto.password,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException(commandResult.error ?? 'Validation failed');
    }

    // Handler ausfuehren
    const result = await this.completeSetupHandler.execute(commandResult.value);

    // Error Handling - Format passend zum OpenAPI Schema (statusCode, error, message)
    if (result.isFailure || !result.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error === 'SETUP_ALREADY_COMPLETED' ? 'SETUP_ALREADY_COMPLETED' : (result.error ?? 'UNEXPECTED_ERROR'),
      });
    }

    // Success Response (wird durch TransformInterceptor automatisch gewrappt)
    return result.value;
  }
}
