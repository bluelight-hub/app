import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { UserRepository } from './user.repository';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';
import type { UserDto } from './dto/user-management-response.dto';
import { toUserDto } from './mappers/user.mapper';
import { isPrismaP2002 } from '@/common/utils/prisma.util';

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
   * @returns Liste von Benutzern
   */
  async findAll(): Promise<UserDto[]> {
    const users = await this.userRepository.findAllLite();
    return users.map(toUserDto);
  }

  /**
   * Gibt einen einzelnen aktiven Benutzer zurück
   *
   * @param id - ID des Benutzers
   * @returns Benutzer mit id, username, name und role
   * @throws NotFoundException wenn der Benutzer nicht existiert, gelöscht oder gesperrt ist
   */
  async findOne(id: string): Promise<UserDto> {
    const user = await this.userRepository.findById(id, {
      id: true,
      username: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      isDeleted: true,
      isLocked: true,
      lockReason: true,
    });
    if (!user || user.isDeleted || user.isLocked) {
      throw new NotFoundException('Benutzer nicht gefunden');
    }
    return toUserDto(user);
  }

  /**
   * Erstellt einen neuen Benutzer oder reaktiviert einen gelöschten Benutzer
   *
   * Wenn ein gelöschter Benutzer mit gleichem Username existiert, wird dieser
   * automatisch reaktiviert statt einen neuen Benutzer zu erstellen.
   *
   * @param dto - Benutzerdaten (username und optionale role)
   * @returns Der erstellte oder reaktivierte Benutzer
   * @throws ConflictException wenn der Benutzername bereits von einem aktiven Benutzer verwendet wird
   */
  async create(dto: CreateUserDto) {
    return await this.userRepository.transaction(async (prisma) => {
      // Prüfen ob ein gelöschter Benutzer mit diesem Username existiert
      const deletedUser = await prisma.user.findFirst({
        where: {
          username: dto.username,
          isDeleted: true,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          isLocked: true,
          lockReason: true,
        },
      });

      // Wenn gelöschter User existiert, reaktivieren
      if (deletedUser) {
        const reactivatedUser = await prisma.user.update({
          where: { id: deletedUser.id },
          data: {
            isDeleted: false,
            deletedAt: null,
            deletedBy: null,
            isActive: true,
            role: dto.role || deletedUser.role, // Neue Rolle oder alte beibehalten
            failedLoginCount: 0,
            lockedUntil: null,
          },
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isLocked: true,
            lockReason: true,
          },
        });
        return toUserDto(reactivatedUser);
      }

      // Neuen Benutzer erstellen
      try {
        const user = await prisma.user.create({
          data: {
            username: dto.username,
            role: dto.role || UserRole.USER,
          },
          select: {
            id: true,
            username: true,
            role: true,
            createdAt: true,
            updatedAt: true,
            isLocked: true,
            lockReason: true,
          },
        });
        return toUserDto(user);
      } catch (error: unknown) {
        // Handle Prisma unique constraint violation (aktiver User existiert bereits)
        if (isPrismaP2002(error)) {
          throw new ConflictException('Benutzername bereits vergeben');
        }
        throw error;
      }
    });
  }

  /**
   * Aktualisiert einen bestehenden aktiven Benutzer
   *
   * @param id - ID des zu aktualisierenden Benutzers
   * @param dto - Zu aktualisierende Felder
   * @returns Der aktualisierte Benutzer
   * @throws NotFoundException wenn der Benutzer nicht existiert, gelöscht oder gesperrt ist
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
          isDeleted: true,
          isLocked: true,
        },
      });

      if (!existingUser || existingUser.isDeleted || existingUser.isLocked) {
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
            isLocked: true,
            lockReason: true,
          },
        });

        return toUserDto(updatedUser);
      } catch (error: unknown) {
        // Handle Prisma unique constraint violation
        if (isPrismaP2002(error)) {
          throw new ConflictException('Benutzername bereits vergeben');
        }
        throw error;
      }
    });
  }

  /**
   * Sperrt einen Benutzer manuell
   *
   * @param id - ID des zu sperrenden Benutzers
   * @param reason - Grund der Sperrung
   * @param lockedBy - ID des Admin-Benutzers der die Sperre durchführt
   * @throws NotFoundException wenn der Benutzer nicht existiert oder bereits gelöscht ist
   * @throws BadRequestException wenn versucht wird, den letzten SUPER_ADMIN zu sperren
   */
  async lock(id: string, reason?: string, lockedBy?: string): Promise<UserDto> {
    return await this.userRepository.transaction(async (prisma) => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          isDeleted: true,
          isLocked: true,
        },
      });

      if (!user || user.isDeleted) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      if (user.isLocked) {
        throw new BadRequestException('Benutzer ist bereits gesperrt');
      }

      // Prüfen, ob dies der letzte SUPER_ADMIN ist
      if (user.role === UserRole.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            isDeleted: false,
            isLocked: false,
          },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException('Der letzte aktive SUPER_ADMIN kann nicht gesperrt werden');
        }
      }

      const lockedUser = await prisma.user.update({
        where: { id },
        data: {
          isLocked: true,
          lockedManuallyAt: new Date(),
          lockedManuallyBy: lockedBy || id,
          lockReason: reason,
          isActive: false,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          isLocked: true,
          lockReason: true,
        },
      });

      return toUserDto(lockedUser);
    });
  }

  /**
   * Entsperrt einen manuell gesperrten Benutzer
   *
   * @param id - ID des zu entsperrenden Benutzers
   * @throws NotFoundException wenn der Benutzer nicht existiert oder bereits gelöscht ist
   * @throws BadRequestException wenn der Benutzer nicht gesperrt ist
   */
  async unlock(id: string): Promise<UserDto> {
    return await this.userRepository.transaction(async (prisma) => {
      const user = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          isDeleted: true,
          isLocked: true,
        },
      });

      if (!user || user.isDeleted) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      if (!user.isLocked) {
        throw new BadRequestException('Benutzer ist nicht gesperrt');
      }

      const unlockedUser = await prisma.user.update({
        where: { id },
        data: {
          isLocked: false,
          lockedManuallyAt: null,
          lockedManuallyBy: null,
          lockReason: null,
          isActive: true,
          failedLoginCount: 0,
          lockedUntil: null,
        },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          isLocked: true,
          lockReason: true,
        },
      });

      return toUserDto(unlockedUser);
    });
  }

  /**
   * Löscht einen Benutzer mit Soft Delete (Transaktionssicherheit)
   *
   * Bei Admin-Benutzern wird optional ein Downgrade zu USER angeboten
   * Verhindert das Löschen des letzten SUPER_ADMIN Benutzers
   * Verwendet Soft Delete, um Datenintegrität (z.B. ETB createdBy) zu erhalten
   *
   * @param id - ID des zu löschenden Benutzers
   * @param downgradeAdmin - Bei true: Admin wird zu USER herabgestuft statt gelöscht
   * @throws NotFoundException wenn der Benutzer nicht existiert oder bereits gelöscht ist
   * @throws BadRequestException wenn versucht wird, den letzten SUPER_ADMIN zu löschen
   */
  async remove(id: string, downgradeAdmin = false): Promise<void> {
    await this.userRepository.transaction(async (prisma) => {
      // Benutzer finden
      const userToDelete = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          role: true,
          isDeleted: true,
        },
      });

      if (!userToDelete || userToDelete.isDeleted) {
        throw new NotFoundException('Benutzer nicht gefunden');
      }

      // Prüfen, ob dies der letzte SUPER_ADMIN ist
      if (userToDelete.role === UserRole.SUPER_ADMIN) {
        const superAdminCount = await prisma.user.count({
          where: {
            role: UserRole.SUPER_ADMIN,
            isDeleted: false,
          },
        });

        if (superAdminCount <= 1) {
          throw new BadRequestException('Der letzte SUPER_ADMIN kann nicht gelöscht werden');
        }
      }

      const isAdminUser = userToDelete.role === UserRole.ADMIN || userToDelete.role === UserRole.SUPER_ADMIN;

      // Admin-Downgrade statt Löschen (wenn gewünscht und User ist Admin)
      if (downgradeAdmin && isAdminUser) {
        await prisma.user.update({
          where: { id },
          data: {
            role: UserRole.USER,
            passwordHash: null, // Admin-Passwort entfernen
          },
        });
        return;
      }

      // Soft Delete: Benutzer als gelöscht markieren
      // Bei Admins: Automatisch zu USER herabstufen + Passwort entfernen
      // Lock-Status wird aufgehoben, da gelöschte User nicht mehr relevant sind
      await prisma.user.update({
        where: { id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: id, // TODO: Aktuellen Admin-User übergeben
          isActive: false,
          // Lock-Felder zurücksetzen
          isLocked: false,
          lockedManuallyAt: null,
          lockedManuallyBy: null,
          lockReason: null,
          failedLoginCount: 0,
          lockedUntil: null,
          ...(isAdminUser && {
            role: UserRole.USER,
            passwordHash: null,
          }),
        },
      });
    });
  }
}
