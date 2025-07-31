import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard, Roles, RolesGuard, UserRole } from '@/modules/auth';
import { AdminService } from './admin.service';

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
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Letzte Aktivitäten abrufen' })
  @ApiResponse({ status: 200, description: 'Aktivitäten erfolgreich abgerufen' })
  async getActivities(@Query('limit') limit?: number) {
    return this.adminService.getRecentActivities(limit || 20);
  }

  /**
   * Ruft Dashboard-Statistiken ab
   */
  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  @ApiOperation({ summary: 'Dashboard-Statistiken abrufen' })
  @ApiResponse({ status: 200, description: 'Statistiken erfolgreich abgerufen' })
  async getDashboardStats() {
    return this.adminService.getDashboardStats();
  }
}
