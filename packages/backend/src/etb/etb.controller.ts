import { Controller, Post, Get, Put, Delete, Body, Param, Query, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { EtbService } from './etb.service';
import { CreateEtbDto } from './dto/create-etb.dto';
import { CreateEtbEintragDto } from './dto/create-etb-eintrag.dto';
import { UpdateEtbEintragDto } from './dto/update-etb-eintrag.dto';

@ApiTags('ETB')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('etb')
export class EtbController {
  constructor(private readonly etbService: EtbService) {}

  @Post()
  @ApiOperation({ summary: 'Create new ETB for an Einsatz' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'ETB created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'ETB already exists for this Einsatz' })
  async createEtb(@Body() createEtbDto: CreateEtbDto, @CurrentUser() user: User) {
    return this.etbService.createEtb(createEtbDto, user);
  }

  @Get(':einsatzId')
  @ApiOperation({ summary: 'Get ETB by Einsatz ID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'ETB found' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'ETB not found' })
  async getEtbByEinsatzId(@Param('einsatzId') einsatzId: string, @Query('limit') limit?: string, @Query('offset') offset?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : undefined;
    const parsedOffset = offset ? parseInt(offset, 10) : undefined;
    return this.etbService.getEtbByEinsatzId(einsatzId, parsedLimit, parsedOffset);
  }

  @Post(':id/eintraege')
  @ApiOperation({ summary: 'Create new ETB entry' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Entry created successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'ETB not found' })
  async createEintrag(@Param('id') etbId: string, @Body() createEintragDto: CreateEtbEintragDto, @CurrentUser() user: User) {
    return this.etbService.createEintrag(etbId, createEintragDto, user);
  }

  @Put('eintraege/:id')
  @ApiOperation({ summary: 'Update ETB entry' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Entry updated successfully' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Invalid input' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async updateEintrag(@Param('id') eintragId: string, @Body() updateEintragDto: UpdateEtbEintragDto, @CurrentUser() user: User) {
    return this.etbService.updateEintrag(eintragId, updateEintragDto, user);
  }

  @Delete('eintraege/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete ETB entry' })
  @ApiResponse({ status: HttpStatus.NO_CONTENT, description: 'Entry deleted successfully' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Entry not found' })
  async deleteEintrag(@Param('id') eintragId: string, @CurrentUser() user: User) {
    await this.etbService.deleteEintrag(eintragId, user);
  }

  @Get('textbausteine')
  @ApiOperation({ summary: 'Get all text templates' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Text templates retrieved' })
  async getTextbausteine() {
    return this.etbService.getTextbausteine();
  }
}
