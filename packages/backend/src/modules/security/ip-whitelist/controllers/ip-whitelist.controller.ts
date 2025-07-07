import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { IpWhitelistService } from '../services/ip-whitelist.service';
import { CreateIpWhitelistDto, UpdateIpWhitelistDto, QueryIpWhitelistDto } from '../dto';
import { IpWhitelist } from '../entities/ip-whitelist.entity';
import { JwtAuthGuard } from '../../../auth/guards';
import { RequirePermissions, CurrentUser } from '../../../auth/decorators';
import { Permission } from '../../../auth/types/jwt.types';
import { PaginatedResponse } from '../../../../common/interfaces/paginated-response.interface';

/**
 * Controller für die Verwaltung der IP-Whitelist
 */
@ApiTags('security/ip-whitelist')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/admin/security/whitelist')
export class IpWhitelistController {
  constructor(private readonly ipWhitelistService: IpWhitelistService) {}

  @Post()
  @RequirePermissions(Permission.IP_WHITELIST_WRITE)
  @ApiOperation({ summary: 'Erstellt einen neuen IP-Whitelist-Eintrag' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'IP-Whitelist-Eintrag erfolgreich erstellt',
    type: IpWhitelist,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'IP-Adresse existiert bereits',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Ungültige Eingabedaten',
  })
  async create(
    @Body() createDto: CreateIpWhitelistDto,
    @CurrentUser() user: any,
  ): Promise<IpWhitelist> {
    return this.ipWhitelistService.create(createDto, user.id, user.email);
  }

  @Get()
  @RequirePermissions(Permission.IP_WHITELIST_READ)
  @ApiOperation({ summary: 'Listet alle IP-Whitelist-Einträge auf' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste der IP-Whitelist-Einträge',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/IpWhitelist' },
        },
        meta: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            page: { type: 'number' },
            lastPage: { type: 'number' },
            limit: { type: 'number' },
          },
        },
      },
    },
  })
  async findAll(@Query() query: QueryIpWhitelistDto): Promise<PaginatedResponse<IpWhitelist>> {
    return this.ipWhitelistService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(Permission.IP_WHITELIST_READ)
  @ApiOperation({ summary: 'Ruft einen spezifischen IP-Whitelist-Eintrag ab' })
  @ApiParam({
    name: 'id',
    description: 'ID des IP-Whitelist-Eintrags',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IP-Whitelist-Eintrag gefunden',
    type: IpWhitelist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'IP-Whitelist-Eintrag nicht gefunden',
  })
  async findOne(@Param('id') id: string): Promise<IpWhitelist> {
    return this.ipWhitelistService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions(Permission.IP_WHITELIST_WRITE)
  @ApiOperation({ summary: 'Aktualisiert einen IP-Whitelist-Eintrag' })
  @ApiParam({
    name: 'id',
    description: 'ID des IP-Whitelist-Eintrags',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'IP-Whitelist-Eintrag erfolgreich aktualisiert',
    type: IpWhitelist,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'IP-Whitelist-Eintrag nicht gefunden',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'IP-Adresse existiert bereits',
  })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateIpWhitelistDto,
    @CurrentUser() user: any,
  ): Promise<IpWhitelist> {
    return this.ipWhitelistService.update(id, updateDto, user.id, user.email);
  }

  @Delete(':id')
  @RequirePermissions(Permission.IP_WHITELIST_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Löscht einen IP-Whitelist-Eintrag' })
  @ApiParam({
    name: 'id',
    description: 'ID des IP-Whitelist-Eintrags',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'IP-Whitelist-Eintrag erfolgreich gelöscht',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'IP-Whitelist-Eintrag nicht gefunden',
  })
  async remove(@Param('id') id: string, @CurrentUser() user: any): Promise<void> {
    await this.ipWhitelistService.remove(id, user.id, user.email);
  }

  @Post('check')
  @RequirePermissions(Permission.IP_WHITELIST_READ)
  @ApiOperation({ summary: 'Prüft ob eine IP-Adresse erlaubt ist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Prüfergebnis',
    schema: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
        ipAddress: { type: 'string' },
        endpoint: { type: 'string', nullable: true },
      },
    },
  })
  async checkIp(
    @Body() body: { ipAddress: string; endpoint?: string },
  ): Promise<{ allowed: boolean; ipAddress: string; endpoint?: string }> {
    const allowed = await this.ipWhitelistService.isIpAllowed(body.ipAddress, body.endpoint);
    return {
      allowed,
      ipAddress: body.ipAddress,
      endpoint: body.endpoint,
    };
  }

  @Post('cleanup')
  @RequirePermissions(Permission.IP_WHITELIST_DELETE)
  @ApiOperation({ summary: 'Bereinigt abgelaufene temporäre Einträge' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Anzahl der gelöschten Einträge',
    schema: {
      type: 'object',
      properties: {
        deletedCount: { type: 'number' },
      },
    },
  })
  async cleanup(): Promise<{ deletedCount: number }> {
    const deletedCount = await this.ipWhitelistService.cleanupExpiredEntries();
    return { deletedCount };
  }
}
