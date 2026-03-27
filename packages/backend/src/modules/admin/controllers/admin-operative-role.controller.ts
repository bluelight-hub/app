import { BadRequestException, Body, Controller, HttpCode, HttpStatus, Param, Patch, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBadRequestResponse, ApiForbiddenResponse, ApiNotFoundResponse, ApiOperation, ApiParam, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';

import { ChangeOperativeRoleHandler } from '@/application/user-management/commands/change-operative-role/change-operative-role.handler';
import { ChangeOperativeRoleCommand } from '@/application/user-management/commands/change-operative-role/change-operative-role.command';
import { AssignStammpersonHandler } from '@/application/user-management/commands/assign-stammperson/assign-stammperson.handler';
import { AssignStammpersonCommand } from '@/application/user-management/commands/assign-stammperson/assign-stammperson.command';
import { ChangeOperativeRoleDto } from '@/application/user-management/dto/change-operative-role.dto';
import { AssignStammpersonDto } from '@/application/user-management/dto/assign-stammperson.dto';
import { OperativeRoleResponseDto } from '@/application/user-management/dto/operative-role-response.dto';

/**
 * Controller für Admin-Operationen zu operativen Nutzer-Rollen.
 *
 * Erfordert Admin-Rolle (ADMIN oder SUPER_ADMIN) via AdminJwtAuthGuard.
 * Stellt Endpoints zur Verwaltung von operativen Rollen und Stammperson-Zuweisungen bereit.
 *
 * **Endpoints:**
 * - PATCH /admin/users/:id/operative-role — Ändert die operative Rolle eines Users
 * - PATCH /admin/users/:id/stammperson — Weist einem User eine Stammperson zu oder entfernt sie
 */
@Controller({ path: 'admin/users', version: ['alpha', '1'] })
@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert — Admin-Login erforderlich' })
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
export class AdminOperativeRoleController {
  constructor(
    private readonly changeOperativeRoleHandler: ChangeOperativeRoleHandler,
    private readonly assignStammpersonHandler: AssignStammpersonHandler,
  ) {}

  /**
   * Ändert die operative Rolle eines Users.
   *
   * Nur Admins können operative Rollen ändern. Die Rolle bestimmt
   * den operativen Zugang des Users (Führungskraft, Einsatzkraft, Externe).
   *
   * @param id - User-ID
   * @param dto - ChangeOperativeRoleDto mit neuer Rolle
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns OperativeRoleResponseDto mit userId und Statusmeldung
   * @throws BadRequestException bei Validierungsfehlern oder gleicher Rolle
   */
  @Patch(':id/operative-role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Operative Rolle ändern',
    description: 'Ändert die operative Rolle eines Users. Erlaubte Werte: FUEHRUNGSKRAFT, EINSATZKRAFT, EXTERNE.',
  })
  @ApiParam({
    name: 'id',
    description: 'User-ID',
    example: 'clx_user_abc123',
  })
  @ApiWrappedResponse(OperativeRoleResponseDto, {
    description: 'Operative Rolle erfolgreich geändert',
  })
  @ApiBadRequestResponse({ description: 'Ungültige Rolle oder gleiche Rolle wie zuvor' })
  @ApiNotFoundResponse({ description: 'User nicht gefunden' })
  async changeOperativeRole(
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: ChangeOperativeRoleDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<OperativeRoleResponseDto> {
    // 1. Command erstellen mit Validierung
    const commandResult = ChangeOperativeRoleCommand.create({
      userId: id,
      newRole: dto.operativeRole,
      changedBy: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: commandResult.error ?? 'Ungültige Eingabe',
      });
    }

    // 2. Handler ausführen
    const result = await this.changeOperativeRoleHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error ?? 'Rollenänderung fehlgeschlagen',
      });
    }

    // 3. Success Response
    return {
      userId: result.value,
      message: 'Operative Rolle erfolgreich geändert',
    };
  }

  /**
   * Weist einem User eine Stammperson zu oder entfernt die Zuweisung.
   *
   * Nur Admins können Stammperson-Zuweisungen ändern.
   * Eine Stammperson kann nur einem User zugewiesen sein.
   *
   * @param id - User-ID
   * @param dto - AssignStammpersonDto mit Stammperson-ID (oder null)
   * @param user - Authentifizierter Admin-User aus JWT
   * @returns OperativeRoleResponseDto mit userId und Statusmeldung
   * @throws BadRequestException bei Validierungsfehlern
   */
  @Patch(':id/stammperson')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stammperson zuweisen',
    description: 'Weist einem User eine Stammperson zu. stammpersonId = null entfernt die Zuweisung.',
  })
  @ApiParam({
    name: 'id',
    description: 'User-ID',
    example: 'clx_user_abc123',
  })
  @ApiWrappedResponse(OperativeRoleResponseDto, {
    description: 'Stammperson erfolgreich zugewiesen',
  })
  @ApiBadRequestResponse({ description: 'Stammperson nicht gefunden oder bereits zugewiesen' })
  @ApiNotFoundResponse({ description: 'User nicht gefunden' })
  async assignStammperson(
    @Param('id') id: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    dto: AssignStammpersonDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<OperativeRoleResponseDto> {
    // 1. Command erstellen mit Validierung
    const commandResult = AssignStammpersonCommand.create({
      userId: id,
      stammpersonId: dto.stammpersonId ?? null,
      assignedBy: user.userId,
    });

    if (commandResult.isFailure || !commandResult.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: commandResult.error ?? 'Ungültige Eingabe',
      });
    }

    // 2. Handler ausführen
    const result = await this.assignStammpersonHandler.execute(commandResult.value);

    if (result.isFailure || !result.value) {
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error ?? 'Stammperson-Zuweisung fehlgeschlagen',
      });
    }

    // 3. Success Response
    const message = dto.stammpersonId ? 'Stammperson erfolgreich zugewiesen' : 'Stammperson-Zuweisung entfernt';
    return {
      userId: result.value,
      message,
    };
  }
}
