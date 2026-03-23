import { Controller, Get, InternalServerErrorException, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiTooManyRequestsResponse, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ApiWrappedResponse } from '@/modules/common/decorators/api-wrapped-response.decorator';
import { AdminJwtAuthGuard } from '@/modules/auth/guards/admin-jwt-auth.guard';
import { ADMIN_RATE_LIMIT } from '@/infrastructure/http/constants/rate-limit.constants';
import { GetAvailablePermissionsQuery, GetAvailablePermissionsQueryHandler, AvailablePermissionDto } from '@application/user-management';

/**
 * Controller fuer Admin-Permission-Verwaltung.
 *
 * Stellt Endpoints fuer das Abfragen verfuegbarer Permissions bereit.
 *
 * @endpoint /admin/permissions (version: alpha)
 */
@ApiTags('permissions')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gueltige Admin-Authentifizierung' })
@ApiTooManyRequestsResponse({ description: 'Rate limit überschritten' })
@Controller({ path: 'admin/permissions', version: 'alpha' })
@UseGuards(AdminJwtAuthGuard)
@Throttle({ default: ADMIN_RATE_LIMIT })
export class AdminPermissionsController {
  constructor(private readonly getAvailablePermissionsHandler: GetAvailablePermissionsQueryHandler) {}

  /**
   * Alle verfuegbaren Permission-Patterns abrufen.
   */
  @Get('available')
  @ApiOperation({ summary: 'Verfuegbare Permission-Patterns abrufen' })
  @ApiWrappedResponse(AvailablePermissionDto, {
    isArray: true,
    description: 'Liste aller verfuegbaren Permission-Domains',
  })
  async getAvailablePermissions(): Promise<AvailablePermissionDto[]> {
    const result = await this.getAvailablePermissionsHandler.execute(new GetAvailablePermissionsQuery());

    if (result.isFailure) {
      throw new InternalServerErrorException(result.error ?? 'Failed to fetch available permissions');
    }

    return result.value ?? [];
  }
}
