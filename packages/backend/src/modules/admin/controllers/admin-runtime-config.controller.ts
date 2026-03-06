import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBody, ApiForbiddenResponse, ApiOperation, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { AppConfigService } from '@/infrastructure/services/app-config.service';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import {
  MigrateLegacyRuntimeConfigRequestDto,
  MigrateLegacyRuntimeConfigResultDto,
  DeleteRuntimeConfigResultDto,
  RuntimeConfigEntryDto,
  RuntimeConfigListDto,
  UpsertRuntimeConfigRequestDto,
} from '@/application/admin/dto/runtime-config.dto';

@Controller({ path: 'admin/runtime-config', version: 'alpha' })
@ApiTags('admin')
@UseGuards(AdminJwtAuthGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert - Admin-Login erforderlich' })
@ApiForbiddenResponse({ description: 'Keine Admin-Berechtigung' })
export class AdminRuntimeConfigController {
  constructor(private readonly appConfig: AppConfigService) {}

  @Get()
  @ApiOperation({
    summary: 'Secret- und Runtime-Konfiguration auflisten',
    description: 'Liefert Runtime-Konfiguration inklusive Quelle, Kategorie, Bearbeitbarkeit und maskierter Secret-Werte.',
  })
  @ApiWrappedResponse(RuntimeConfigListDto, {
    description: 'Runtime-Konfiguration erfolgreich geladen',
  })
  listRuntimeConfig(): RuntimeConfigListDto {
    const entries = this.appConfig.listRuntimeConfig();
    return { entries };
  }

  @Put(':key')
  @ApiOperation({
    summary: 'Runtime-Konfiguration speichern',
    description: 'Speichert einen Runtime-Wert in der DB (non-sensitive in app_config, sensitive in app_config_secret).',
  })
  @ApiBody({
    type: UpsertRuntimeConfigRequestDto,
    description: 'Zu speichernder Runtime-Wert',
  })
  @ApiWrappedResponse(RuntimeConfigEntryDto, {
    description: 'Runtime-Konfiguration erfolgreich gespeichert',
  })
  async upsertRuntimeConfig(
    @Param('key') key: string,
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: UpsertRuntimeConfigRequestDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<RuntimeConfigEntryDto> {
    await this.appConfig.upsertRuntimeConfig({
      key,
      value: body.value,
      sensitive: body.sensitive,
      sourceHint: body.sourceHint,
      updatedBy: user.userId,
    });

    const entry = this.appConfig.listRuntimeConfig().find((runtimeEntry) => runtimeEntry.key === key);

    return {
      key,
      value: entry?.value ?? null,
      source: entry?.source ?? 'default',
      sensitive: entry?.sensitive ?? false,
      category: entry?.category ?? 'runtime',
      editable: entry?.editable ?? true,
      configured: entry?.configured ?? false,
    };
  }

  @Delete(':key')
  @ApiOperation({
    summary: 'Editierbares Secret löschen',
    description: 'Löscht editierbare Runtime-/Secret-Einträge aus der Datenbank. Interne Secrets bleiben schreibgeschützt.',
  })
  @ApiWrappedResponse(DeleteRuntimeConfigResultDto, {
    description: 'Runtime-Konfiguration erfolgreich gelöscht',
  })
  async deleteRuntimeConfig(@Param('key') key: string, @CurrentUser() user: ValidatedUser): Promise<DeleteRuntimeConfigResultDto> {
    await this.appConfig.deleteRuntimeConfig({
      key,
      updatedBy: user.userId,
      sourceHint: 'ui',
    });

    return {
      key,
      deleted: true,
    };
  }

  @Post('migrate-legacy')
  @ApiOperation({
    summary: 'Legacy-ENV-Werte in die Runtime-DB migrieren',
    description: 'Migriert Legacy-ENV-Fallback-Keys in die Runtime-Konfiguration in der Datenbank. Nicht gefundene oder nicht migrierbare Keys werden in der Antwort als skipped/failed ausgegeben.',
  })
  @ApiBody({
    type: MigrateLegacyRuntimeConfigRequestDto,
    description: 'Optionale Schlüssel-Liste und Dry-Run-Modus für die Migration.',
  })
  @ApiWrappedResponse(MigrateLegacyRuntimeConfigResultDto, {
    description: 'Legacy-ENV-Migration abgeschlossen',
  })
  async migrateLegacyRuntimeConfig(
    @Body(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
      }),
    )
    body: MigrateLegacyRuntimeConfigRequestDto,
    @CurrentUser() user: ValidatedUser,
  ): Promise<MigrateLegacyRuntimeConfigResultDto> {
    const result = await this.appConfig.migrateLegacyRuntimeKeysToDb({
      keys: body.keys,
      dryRun: body.dryRun,
      updatedBy: user.userId,
    });

    return {
      migratedKeys: result.migratedKeys,
      skippedKeys: result.skippedKeys,
      failedKeys: result.failedKeys,
      summary: result.summary,
    };
  }
}
