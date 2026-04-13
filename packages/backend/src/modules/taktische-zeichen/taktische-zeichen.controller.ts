import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiForbiddenResponse, ApiNoContentResponse, ApiOperation, ApiQuery, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { ApiWrappedCreatedResponse, ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { JwtAuthGuard } from '@/modules/auth/guards/jwt-auth.guard';
import { RolesGuard } from '@/modules/auth/guards/roles.guard';
import { Roles } from '@/modules/auth/decorators/roles.decorator';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { ValidatedUser } from '@/modules/auth/strategies/jwt.strategy';
import { TaktischesZeichenResponseDto } from '@application/taktische-zeichen/dtos/taktisches-zeichen-response.dto';
import { ZeichenKatalogEintragResponseDto } from '@application/taktische-zeichen/dtos/zeichen-katalog-eintrag-response.dto';
import { ErstelleZeichenCommand } from '@application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.command';
import { ErstelleZeichenHandler } from '@application/taktische-zeichen/commands/erstelle-zeichen/erstelle-zeichen.handler';
import { PlatziereZeichenCommand } from '@application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.command';
import { PlatziereZeichenHandler } from '@application/taktische-zeichen/commands/platziere-zeichen/platziere-zeichen.handler';
import { AktualisiereZeichenCommand } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.command';
import { AktualisiereZeichenHandler } from '@application/taktische-zeichen/commands/aktualisiere-zeichen/aktualisiere-zeichen.handler';
import { EntferneZeichenCommand } from '@application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.command';
import { EntferneZeichenHandler } from '@application/taktische-zeichen/commands/entferne-zeichen/entferne-zeichen.handler';
import { FindeZeichenFuerEinsatzQuery } from '@application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.query';
import { FindeZeichenFuerEinsatzHandler } from '@application/taktische-zeichen/queries/finde-zeichen-fuer-einsatz/finde-zeichen-fuer-einsatz.handler';
import { FindeKatalogEintraegeQuery } from '@application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.query';
import { FindeKatalogEintraegeHandler } from '@application/taktische-zeichen/queries/finde-katalog-eintraege/finde-katalog-eintraege.handler';
import { FindeDefaultZeichenQuery } from '@application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.query';
import { FindeDefaultZeichenHandler } from '@application/taktische-zeichen/queries/finde-default-zeichen/finde-default-zeichen.handler';
import { CreateTaktischesZeichenDto } from './dtos/create-taktisches-zeichen.dto';
import { UpdateTaktischesZeichenDto } from './dtos/update-taktisches-zeichen.dto';
import { PlatziereZeichenDto } from './dtos/platziere-zeichen.dto';

@ApiTags('Taktische Zeichen')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiUnauthorizedResponse({ description: 'Nicht authentifiziert' })
@ApiForbiddenResponse({ description: 'Keine Berechtigung' })
@Controller({ version: 'alpha' })
export class TaktischeZeichenController {
  constructor(
    private readonly erstelleHandler: ErstelleZeichenHandler,
    private readonly platziereHandler: PlatziereZeichenHandler,
    private readonly aktualisiereHandler: AktualisiereZeichenHandler,
    private readonly entferneHandler: EntferneZeichenHandler,
    private readonly findeZeichenHandler: FindeZeichenFuerEinsatzHandler,
    private readonly findeKatalogHandler: FindeKatalogEintraegeHandler,
    private readonly findeDefaultHandler: FindeDefaultZeichenHandler,
  ) {}

  @Get('einsatz/:einsatzId/taktische-zeichen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Alle taktischen Zeichen eines Einsatzes abrufen' })
  @ApiWrappedResponse(TaktischesZeichenResponseDto, { isArray: true, description: 'Liste der taktischen Zeichen' })
  async findAll(@Param('einsatzId') einsatzId: string) {
    const queryResult = FindeZeichenFuerEinsatzQuery.create({ einsatzId });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeZeichenHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Post('einsatz/:einsatzId/taktische-zeichen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen erstellen' })
  @ApiWrappedCreatedResponse(TaktischesZeichenResponseDto, { description: 'Zeichen erstellt' })
  async create(@Param('einsatzId') einsatzId: string, @Body() dto: CreateTaktischesZeichenDto, @CurrentUser() user: ValidatedUser) {
    const cmdResult = ErstelleZeichenCommand.create({
      einsatzId,
      zeichenDefinition: dto.zeichenDefinition,
      referenzTyp: dto.referenzTyp,
      referenzId: dto.referenzId,
      label: dto.label,
      notiz: dto.notiz,
      istAusKatalog: dto.istAusKatalog,
      katalogEintragId: dto.katalogEintragId,
      erstelltVon: user.userId,
      lagekarteId: dto.lagekarteId,
      lat: dto.lat,
      lng: dto.lng,
      mgrs: dto.mgrs,
    });
    if (cmdResult.isFailure || !cmdResult.value) {
      throw new BadRequestException(cmdResult.error);
    }
    const result = await this.erstelleHandler.execute(cmdResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Patch('einsatz/:einsatzId/taktische-zeichen/:zeichenId')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen aktualisieren' })
  @ApiWrappedResponse(TaktischesZeichenResponseDto, { description: 'Zeichen aktualisiert' })
  async update(@Param('einsatzId') einsatzId: string, @Param('zeichenId') zeichenId: string, @Body() dto: UpdateTaktischesZeichenDto, @CurrentUser() user: ValidatedUser) {
    const cmdResult = AktualisiereZeichenCommand.create({
      einsatzId,
      zeichenId,
      zeichenDefinition: dto.zeichenDefinition,
      label: dto.label,
      notiz: dto.notiz,
      aktualisiertVon: user.userId,
    });
    if (cmdResult.isFailure || !cmdResult.value) {
      throw new BadRequestException(cmdResult.error);
    }
    const result = await this.aktualisiereHandler.execute(cmdResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Delete('einsatz/:einsatzId/taktische-zeichen/:zeichenId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen entfernen' })
  @ApiNoContentResponse({ description: 'Zeichen entfernt' })
  async remove(@Param('einsatzId') einsatzId: string, @Param('zeichenId') zeichenId: string, @CurrentUser() user: ValidatedUser): Promise<void> {
    const cmdResult = EntferneZeichenCommand.create({ einsatzId, zeichenId, entferntVon: user.userId });
    if (cmdResult.isFailure || !cmdResult.value) {
      throw new BadRequestException(cmdResult.error);
    }
    const result = await this.entferneHandler.execute(cmdResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
  }

  @Put('einsatz/:einsatzId/taktische-zeichen/:zeichenId/position')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Taktisches Zeichen auf Karte platzieren' })
  @ApiWrappedResponse(TaktischesZeichenResponseDto, { description: 'Zeichen platziert' })
  async placeOrMove(@Param('einsatzId') einsatzId: string, @Param('zeichenId') zeichenId: string, @Body() dto: PlatziereZeichenDto, @CurrentUser() user: ValidatedUser) {
    const platziereResult = PlatziereZeichenCommand.create({
      einsatzId,
      zeichenId,
      lagekarteId: dto.lagekarteId,
      lat: dto.lat,
      lng: dto.lng,
      mgrs: dto.mgrs,
      platziertVon: user.userId,
    });
    if (platziereResult.isFailure || !platziereResult.value) {
      throw new BadRequestException(platziereResult.error);
    }
    const result = await this.platziereHandler.execute(platziereResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Get('einsatz/:einsatzId/taktische-zeichen/katalog')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Zeichen-Katalog abrufen' })
  @ApiQuery({ name: 'suche', required: false })
  @ApiQuery({ name: 'kategorie', required: false })
  @ApiWrappedResponse(ZeichenKatalogEintragResponseDto, { isArray: true, description: 'Katalog-Einträge' })
  async getKatalog(@Param('einsatzId') _einsatzId: string, @Query('suche') suche?: string, @Query('kategorie') kategorie?: string) {
    const queryResult = FindeKatalogEintraegeQuery.create({ suche, kategorie });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeKatalogHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Get('taktische-zeichen/defaults/fahrzeugtypen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Default-Zeichen für Fahrzeugtypen' })
  async getDefaultsFahrzeugtypen() {
    const queryResult = FindeDefaultZeichenQuery.create({ typ: 'fahrzeugtypen' });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeDefaultHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }

  @Get('taktische-zeichen/defaults/einheitentypen')
  @Roles('USER', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Default-Zeichen für Einheitentypen' })
  async getDefaultsEinheitentypen() {
    const queryResult = FindeDefaultZeichenQuery.create({ typ: 'einheitentypen' });
    if (queryResult.isFailure || !queryResult.value) {
      throw new BadRequestException(queryResult.error);
    }
    const result = await this.findeDefaultHandler.execute(queryResult.value);
    if (result.isFailure) throw new BadRequestException(result.error);
    return result.value;
  }
}
