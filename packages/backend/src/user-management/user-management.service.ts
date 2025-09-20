import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UserRepository } from './user.repository';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserDto } from './dto/user-management-response.dto';
import { toUserDto } from './mappers/user.mapper';

/**
 * Service für die Benutzerverwaltung durch Administratoren
 *
 * Stellt Funktionen zur Verfügung für:
 * - Auflisten aller Benutzer
 * - Erstellen neuer Benutzer
 * - Löschen von Benutzern mit Sicherheitsprüfungen
 */
@Injectable()
export class UserManagementService {
  constructor(private readonly userRepository: UserRepository) {}

  /**
   * Gibt alle Benutzer mit nur den wichtigsten Feldern zurück
   *
   * @returns Array von Benutzern mit id, username und role
   */
  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepository.findAllLite();
    return users.map(toUserDto);
  }

  /**
   * Erstellt einen neuen Benutzer
   *
   * @param dto - Benutzerdaten (username und optionale role)
   * @returns Der erstellte Benutzer mit id, username und role
   * @throws ConflictException wenn der Benutzername bereits existiert
   */
  async create(dto: CreateUserDto) {
    try {
      // Benutzer erstellen mit Standardrolle USER
      const user = await this.userRepository.create(
        {
          username: dto.username,
          role: dto.role || UserRole.USER,
        },
        {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
        },
      );
      return toUserDto(user);
    } catch (error: unknown) {
      // Handle Prisma unique constraint violation
      if (error instanceof Object && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Benutzername bereits vergeben');
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Aktualisiert einen bestehenden Benutzer
   *
   * @param id - ID des zu aktualisierenden Benutzers
   * @param dto - Zu aktualisierende Felder
   * @returns Der aktualisierte Benutzer
   * @throws NotFoundException wenn der Benutzer nicht existiert
   * @throws ConflictException wenn der neue Benutzername bereits existiert
   * @throws BadRequestException wenn versucht wird, den letzten SUPER_ADMIN herabzustufen
   */
  async update(id: string, dto: UpdateUserDto): Promise<UserDto> {
    return await this.userRepository.transaction(async (prisma) => {
      // Prüfen ob Benutzer existiert
      const existingUser = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
        },
      });

      if (!existingUser) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      // Wenn Rolle geändert wird und der Benutzer ist SUPER_ADMIN
      if (dto.role && dto.role !== existingUser.role && existingUser.role === UserRole.SUPER_ADMIN) {
        // Prüfen ob dies der letzte SUPER_ADMIN wäre
        const superAdminCount = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
          },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException('Der letzte SUPER_ADMIN kann nicht herabgestuft werden');
        }
      }

      try {
        // Benutzer aktualisieren
        const updatedUser = await prisma.user.update({
          where: { id },
          data: {
            ...(dto.username && { username: dto.username }),
            ...(dto.role && { role: dto.role }),
          },
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        return toUserDto(updatedUser);
      } catch (error: unknown) {
        // Handle Prisma unique constraint violation
        if (error instanceof Object && 'code' in error && error.code === 'P2002') {
          throw new ConflictException('Benutzername bereits vergeben');
        }
        throw error;
      }
    });
  }

  /**
   * Löscht einen Benutzer mit Transaktionssicherheit
   *
   * Verhindert das Löschen des letzten SUPER_ADMIN Benutzers
   *
   * @param id - ID des zu löschenden Benutzers
   * @throws NotFoundException wenn der Benutzer nicht existiert
   * @throws BadRequestException wenn versucht wird, den letzten SUPER_ADMIN zu löschen
   */
  async remove(id: string): Promise<void> {
    await this.userRepository.transaction(async (prisma) => {
      // Benutzer finden
      const userToDelete = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
        },
      });

      if (!userToDelete) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      // Prüfen, ob dies der letzte SUPER_ADMIN ist
      if (userToDelete.role === UserRole.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
          },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException('Der letzte SUPER_ADMIN kann nicht gelöscht werden');
        }
      }

      // Benutzer löschen
      await prisma.user.delete({
        where: { id },
      });
    });
  }
}
