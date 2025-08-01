import { Controller, Get, Post, Delete, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from '@prisma/client';

/**
 * Controller für Benutzerverwaltungs-Endpunkte
 *
 * Stellt REST-API-Endpunkte für die Verwaltung von Benutzern bereit.
 * Diese Endpunkte sind in der Regel nur für Administratoren zugänglich.
 *
 * Hinweis: Die Authentifizierung/Autorisierung wird in späteren Tasks implementiert.
 */
@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * Gibt alle Benutzer zurück
   *
   * @returns Liste aller Benutzer
   */
  @Get()
  @ApiOperation({
    summary: 'Alle Benutzer abrufen',
    description: 'Gibt eine Liste aller registrierten Benutzer zurück (ohne Passwort-Hashes)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Liste der Benutzer',
  })
  async findAll(): Promise<Omit<User, 'passwordHash'>[]> {
    return this.userService.findAll();
  }

  /**
   * Gibt einen spezifischen Benutzer zurück
   *
   * @param id - Benutzer-ID
   * @returns Der gefundene Benutzer
   */
  @Get(':id')
  @ApiOperation({
    summary: 'Benutzer anhand ID abrufen',
    description: 'Gibt die Details eines spezifischen Benutzers zurück',
  })
  @ApiParam({
    name: 'id',
    description: 'Die eindeutige ID des Benutzers',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Benutzerdetails',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Benutzer nicht gefunden',
  })
  async findOne(@Param('id') id: string): Promise<Omit<User, 'passwordHash'>> {
    return this.userService.findOne(id);
  }

  /**
   * Erstellt einen neuen Benutzer
   *
   * @param dto - Benutzerdaten
   * @returns Der erstellte Benutzer
   */
  @Post()
  @ApiOperation({
    summary: 'Neuen Benutzer erstellen',
    description: 'Erstellt einen neuen Benutzer im System (nur für Administratoren)',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Benutzer erfolgreich erstellt',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Benutzername bereits vergeben',
  })
  async create(@Body() dto: CreateUserDto): Promise<Omit<User, 'passwordHash'>> {
    // TODO: createdById aus dem authentifizierten Benutzer extrahieren
    // Temporär: Verwende einen Platzhalter
    const createdById = 'system';
    return this.userService.create(dto, createdById);
  }

  /**
   * Löscht einen Benutzer
   *
   * @param id - ID des zu löschenden Benutzers
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Benutzer löschen',
    description: 'Löscht einen Benutzer aus dem System (nur für Administratoren)',
  })
  @ApiParam({
    name: 'id',
    description: 'Die eindeutige ID des zu löschenden Benutzers',
  })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Benutzer erfolgreich gelöscht',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Benutzer nicht gefunden',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Löschen nicht möglich (z.B. letzter Admin)',
  })
  async remove(@Param('id') id: string): Promise<void> {
    // TODO: requestingUserId aus dem authentifizierten Benutzer extrahieren
    // Temporär: Verwende einen Platzhalter
    const requestingUserId = 'system';
    return this.userService.remove(id, requestingUserId);
  }
}
