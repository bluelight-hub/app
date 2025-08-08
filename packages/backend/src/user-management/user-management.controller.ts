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
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AdminJwtAuthGuard } from '@/auth/guards/admin-jwt-auth.guard';
import { UserManagementService } from './user-management.service';
import { CreateUserDto } from './dto/create-user.dto';
import {
  DeleteUserResponse,
  UserResponse,
  UsersListResponse,
} from './dto/user-management-response.dto';
import { toDeleteUserResponseDto } from './mappers/user-management.mapper';

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
  @ApiOkResponse({ type: UsersListResponse, description: 'Liste aller Benutzer' })
  async findAll() {
    return await this.userManagementService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Neuen Benutzer erstellen' })
  @ApiCreatedResponse({ type: UserResponse, description: 'Benutzer erfolgreich erstellt' })
  @ApiResponse({ status: 400, description: 'Ungültige Eingabedaten' })
  @ApiResponse({ status: 409, description: 'Benutzername bereits vergeben' })
  async create(
    @Body(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) dto: CreateUserDto,
  ) {
    return await this.userManagementService.create(dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Benutzer löschen' })
  @ApiOkResponse({ type: DeleteUserResponse, description: 'Benutzer erfolgreich gelöscht' })
  @ApiResponse({ status: 404, description: 'Benutzer nicht gefunden' })
  @ApiResponse({ status: 400, description: 'Letzter SUPER_ADMIN kann nicht gelöscht werden' })
  async remove(@Param('id') id: string) {
    await this.userManagementService.remove(id);
    return toDeleteUserResponseDto(id);
  }
}
