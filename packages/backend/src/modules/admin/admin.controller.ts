import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { Role } from '@prisma/client';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Ruft die letzten Aktivitäten ab
   */
  @Get('activities')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Letzte Aktivitäten abrufen' })
  @ApiResponse({ status: 200, description: 'Aktivitäten erfolgreich abgerufen' })
  async getActivities(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivities(limit || 20);
  }

  /**
   * Ruft Dashboard-Statistiken ab
   */
  @Get('stats')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Dashboard-Statistiken abrufen' })
  @ApiResponse({ status: 200, description: 'Statistiken erfolgreich abgerufen' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}
