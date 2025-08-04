import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@/auth/guards/admin-jwt-auth.guard';
import { UserManagementService } from './user-management.service';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('user-management')
@ApiBearerAuth('admin-jwt')
@ApiUnauthorizedResponse({ description: 'Keine gültige Admin-Authentifizierung' })
@Controller({
  path: 'admin/users',
  version: 'alpha',
})
@UseGuards(AdminJwtAuthGuard)
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  @ApiOperation({ summary: 'Alle Benutzer auflisten' })
  @ApiResponse({ status: 200, description: 'Liste aller Benutzer' })
  findAll() {
    return this.userManagementService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Neuen Benutzer erstellen' })
  @ApiResponse({ status: 201, description: 'Benutzer erfolgreich erstellt' })
  @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
  @ApiResponse({ status: 409, description: 'Benutzername bereits vergeben' })
  create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: CreateUserDto,
  ) {
    return this.userManagementService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Benutzer löschen' })
  @ApiResponse({ status: 200, description: 'Benutzer erfolgreich gelöscht' })
  @ApiResponse({ status: 404, description: 'Benutzer nicht gefunden' })
  @ApiResponse({ status: 400, description: 'Letzter SUPER_ADMIN kann nicht gelöscht werden' })
  remove(@Param('id') id: string) {
    return this.userManagementService.remove(id);
  }
}
